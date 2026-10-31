import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameMode, MatchPhase, PaperPlayer, RoleType, RoomReaction, RoundPhase, TargetRole } from './types/game';
import {
  BOT_POLICE_ACCURACY,
  BOT_POLICE_THINK_MS,
  ROLE_DEFINITIONS,
  ROUND_OPTIONS,
  isSuspectRole,
  pick,
  roundPoints,
  shuffleRoles,
  toBn,
} from './utils/constants';
import { sound } from './utils/audio';
import { FourPlayerTable } from './components/FourPlayerTable';
import { SideScoreDrawer } from './components/SideScoreDrawer';
import { NotebookScoreboard } from './components/NotebookScoreboard';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PassAndPlaySetupModal } from './components/PassAndPlaySetupModal';
import { OnlineRoomHub, WaitingRoom } from './components/OnlineRoomHub';
import { RulesModal } from './components/RulesModal';
import { RoomConnection, RoomMessage } from './utils/roomConnection';
import { Volume2, VolumeX, BookOpen, Bot, ArrowRight, Share2, Check, Globe, Users } from 'lucide-react';

type BgTheme = 'wood' | 'green' | 'navy' | 'mahogany';
type ModalName = 'profile' | 'passAndPlay' | 'online' | 'rules' | 'score';

const THEMES: { id: BgTheme; label: string; swatch: string }[] = [
  { id: 'wood', label: 'সেগুন কাঠ', swatch: '#8a4f24' },
  { id: 'green', label: 'সবুজ ব্ল্যাকবোর্ড', swatch: '#1a4d36' },
  { id: 'navy', label: 'নীল কালির বোর্ড', swatch: '#1e3a68' },
  { id: 'mahogany', label: 'মেহগনি ডেস্ক', swatch: '#5e1c1c' },
];

const BOT_SEATS = [
  { id: 'bot-1', emoji: '👦' },
  { id: 'bot-2', emoji: '🧔' },
  { id: 'bot-3', emoji: '👧' },
];
const PASS_AND_PLAY_EMOJIS = ['🧑‍🎓', '👦', '👧', '🧔'];

// localStorage can throw (private mode, blocked storage); never let that break the game.
function readStore(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

const newPlayer = (id: string, name: string, avatarEmoji: string, isBot: boolean): PaperPlayer => ({
  id,
  name,
  isBot,
  avatarEmoji,
  role: 'babu',
  scoreHistory: [],
  totalScore: 0,
});

function dealRoles(players: PaperPlayer[]): PaperPlayer[] {
  const roles = shuffleRoles();
  return players.map((p, idx) => ({
    ...p,
    role: roles[idx],
    currentDialogue: pick(ROLE_DEFINITIONS[roles[idx]].dialogues),
  }));
}

function roomUrl(roomId?: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (roomId) url.searchParams.set('room', roomId);
  return url.toString();
}

// Prefix the tab title until the player comes back to the tab
function flashTitle(text: string) {
  if (document.visibilityState === 'visible') return;
  const original = document.title.replace(/^🔔[^—]*— /, '');
  document.title = `${text} — ${original}`;
  const restore = () => {
    if (document.visibilityState !== 'visible') return;
    document.title = original;
    document.removeEventListener('visibilitychange', restore);
  };
  document.addEventListener('visibilitychange', restore);
}

export default function App() {
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [bgTheme, setBgTheme] = useState<BgTheme>(() => {
    const saved = readStore('cpdb_bg_theme', 'wood');
    return THEMES.some((t) => t.id === saved) ? (saved as BgTheme) : 'wood';
  });

  // Player profile with persistence
  const [playerName, setPlayerName] = useState(() => readStore('cpdb_player_name', 'আপনি'));
  const [playerEmoji, setPlayerEmoji] = useState(() => readStore('cpdb_player_emoji', '🧑‍🎓'));
  const [botNames, setBotNames] = useState(() => [
    readStore('cpdb_player_x', 'X'),
    readStore('cpdb_player_y', 'Y'),
    readStore('cpdb_player_z', 'Z'),
  ]);
  const [playerId] = useState(() => {
    let id = readStore('cpdb_player_id', '');
    if (!id) {
      id = 'user-' + Math.random().toString(36).substring(2, 10);
      writeStore('cpdb_player_id', id);
    }
    return id;
  });

  const [modal, setModal] = useState<ModalName | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Match state
  const [gameMode, setGameMode] = useState<GameMode>('vsBots');
  const [phase, setPhase] = useState<MatchPhase>('lobby');
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('interrogation');
  const [targetRoleToCatch, setTargetRoleToCatch] = useState<TargetRole>('dakat');
  const [players, setPlayers] = useState<PaperPlayer[]>([]);
  const [accusedPlayerId, setAccusedPlayerId] = useState<string | null>(null);
  const [isCorrectGuess, setIsCorrectGuess] = useState(false);
  // Bumped on every local deal so per-round effects re-run even when the round number repeats
  const [dealId, setDealId] = useState(0);

  // Online room state
  const [activeRoom, setActiveRoom] = useState<WaitingRoom | null>(null);
  const [isMatchmakingActive, setIsMatchmakingActive] = useState(false);
  const [matchmakingWaitingCount, setMatchmakingWaitingCount] = useState(1);
  const [roomTimers, setRoomTimers] = useState<{ turnDeadline?: number; nextRoundAt?: number; wasAutoAccused?: boolean }>({});
  const [reactions, setReactions] = useState<RoomReaction[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const connRef = useRef<RoomConnection | null>(null);
  const lastResolvedRef = useRef<string | null>(null);
  const lastTurnAlertRef = useRef<string | null>(null);
  const prevHumansRef = useRef<{ roomId: string; names: Map<string, string> } | null>(null);

  const isOnline = gameMode === 'online' && activeRoom !== null;

  const showToast = useCallback((text: string, tone: 'error' | 'info' = 'error') => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), tone === 'info' ? 3000 : 4500);
  }, []);

  const playVerdict = (isCorrect: boolean) => {
    sound.playPenScratch();
    if (isCorrect) sound.playSuccess();
    else sound.playWrong();
  };

  // ---- Online connection ----
  const applyRoomMessage = useCallback(
    (msg: RoomMessage) => {
      if (msg.type === 'MATCHMAKING_STATUS') {
        setIsMatchmakingActive(true);
        setMatchmakingWaitingCount(msg.waitingCount || 1);
        return;
      }
      if (msg.type === 'ERROR') {
        setIsMatchmakingActive(false);
        showToast(msg.message);
        return;
      }

      const room = msg.room;
      setIsMatchmakingActive(false);
      setGameMode('online');
      setActiveRoom({
        id: room.id,
        name: room.name,
        status: room.status,
        hostPlayerId: room.hostPlayerId,
        totalRounds: room.totalRounds,
        players: room.players.map((rp: any) => ({
          id: rp.id,
          name: rp.name,
          avatarEmoji: rp.avatarEmoji,
          isBot: rp.isBot,
          isOnline: rp.online,
        })),
      });
      setRoomTimers({ turnDeadline: room.turnDeadline, nextRoundAt: room.nextRoundAt, wasAutoAccused: room.wasAutoAccused });
      setReactions(room.reactions || []);

      // Keep ?room= in the address bar so a refresh drops you straight back in
      if (new URLSearchParams(window.location.search).get('room') !== room.id) {
        window.history.replaceState(null, '', roomUrl(room.id));
      }

      // Join / leave notices
      const humans = new Map<string, string>(
        room.players.filter((p: any) => !p.isBot).map((p: any) => [p.id, p.name] as [string, string])
      );
      const prev = prevHumansRef.current;
      if (prev && prev.roomId === room.id) {
        humans.forEach((name, id) => {
          if (!prev.names.has(id) && id !== playerId) showToast(`${name} রুমে যোগ দিয়েছে 👋`, 'info');
        });
        prev.names.forEach((name, id) => {
          if (!humans.has(id)) showToast(`${name} রুম ছেড়ে গেছে`, 'info');
        });
      }
      prevHumansRef.current = { roomId: room.id, names: humans };
      setTotalRounds(room.totalRounds);
      setCurrentRound(room.currentRound);
      const resolved = room.roundPhase === 'resolved';
      setRoundPhase(resolved ? 'resolved' : 'interrogation');
      setTargetRoleToCatch(room.targetRoleToCatch);
      setAccusedPlayerId(room.accusedPlayerId);
      setIsCorrectGuess(room.isCorrectGuess);
      setPlayers(
        room.players.map((rp: any) => ({
          id: rp.id,
          name: rp.name,
          isBot: rp.isBot,
          avatarEmoji: rp.avatarEmoji,
          role: rp.role,
          currentDialogue: rp.currentDialogue,
          scoreHistory: rp.scoreHistory || [],
          totalScore: rp.totalScore || 0,
          isOnline: rp.online,
        }))
      );

      // "Your turn" alert once per deal when you draw Police
      const myPolice = room.players.find((p: any) => p.role === 'police')?.id === playerId;
      const turnKey = `${room.id}:${room.turnDeadline}`;
      if (room.status === 'playing' && !resolved && myPolice && lastTurnAlertRef.current !== turnKey) {
        lastTurnAlertRef.current = turnKey;
        sound.playPoliceWhistle();
        navigator.vibrate?.(200);
        showToast('আপনি এবার দারোগা! চোর বা ডাকাত ধরুন 👮', 'info');
        flashTitle('🔔 আপনার পালা!');
      }

      const resolvedKey = `${room.id}:${room.nextRoundAt}`;
      if (resolved && room.status === 'playing' && lastResolvedRef.current !== resolvedKey) {
        lastResolvedRef.current = resolvedKey;
        playVerdict(room.isCorrectGuess);
      }

      if (room.status === 'playing') {
        setPhase('playing');
        setModal((m) => (m === 'online' ? null : m));
      } else if (room.status === 'waiting') {
        setPhase('lobby');
      } else if (room.status === 'finished') {
        setPhase((p) => {
          if (p !== 'scoreboard') sound.playVictory();
          return 'scoreboard';
        });
      }
    },
    [showToast, playerId]
  );

  useEffect(() => {
    const conn = new RoomConnection(playerId);
    conn.onmessage = applyRoomMessage;
    conn.onstatus = setIsConnected;
    connRef.current = conn;

    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      conn.send({
        type: 'JOIN_ROOM',
        roomId: roomParam,
        player: { id: playerId, name: playerName, avatarEmoji: playerEmoji },
      });
    }
    return () => conn.close();
    // Connect once per player; profile changes are sent with each action instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, applyRoomMessage]);

  const sendRoomAction = (action: Record<string, unknown>) => connRef.current?.send(action);
  const me = { id: playerId, name: playerName, avatarEmoji: playerEmoji };

  const leaveOnlineRoom = () => {
    connRef.current?.leaveRoom();
    setActiveRoom(null);
    setIsMatchmakingActive(false);
    setReactions([]);
    prevHumansRef.current = null;
    if (window.location.search) window.history.replaceState(null, '', roomUrl());
  };

  // ---- Local matches ----
  const startLocalMatch = (mode: GameMode, seats: PaperPlayer[], rounds: number) => {
    leaveOnlineRoom();
    setGameMode(mode);
    setTotalRounds(rounds);
    sound.playChitDrop();
    dealLocalRound(1, seats);
    setPhase('playing');
  };

  const dealLocalRound = (roundNum: number, seats: PaperPlayer[]) => {
    setPlayers(dealRoles(seats));
    setAccusedPlayerId(null);
    setIsCorrectGuess(false);
    setRoundPhase('interrogation');
    setTargetRoleToCatch('dakat');
    setCurrentRound(roundNum);
    setDealId((d) => d + 1);
  };

  const handleStartBotMatch = () => {
    startLocalMatch(
      'vsBots',
      [
        newPlayer(playerId, playerName, playerEmoji, false),
        ...BOT_SEATS.map((b, i) => newPlayer(b.id, botNames[i], b.emoji, true)),
      ],
      totalRounds
    );
  };

  const handleStartPassAndPlay = (names: string[], rounds: number) => {
    startLocalMatch(
      'passAndPlay',
      names.map((name, idx) => newPlayer(`seat-${idx + 1}`, name, PASS_AND_PLAY_EMOJIS[idx], false)),
      rounds
    );
  };

  const handlePlayAgain = () => {
    if (gameMode === 'vsBots') handleStartBotMatch();
    else startLocalMatch(gameMode, players.map((p) => newPlayer(p.id, p.name, p.avatarEmoji, p.isBot)), totalRounds);
  };

  const resolveLocalAccusation = (suspectId: string, target: TargetRole) => {
    const accused = players.find((p) => p.id === suspectId);
    if (!accused || roundPhase !== 'interrogation') return;
    const isCorrect = accused.role === target;

    setAccusedPlayerId(suspectId);
    setIsCorrectGuess(isCorrect);
    setRoundPhase('resolved');
    setPlayers((prev) =>
      prev.map((p) => {
        const earned = roundPoints(p.role as RoleType, isCorrect, p.id === suspectId, target);
        return { ...p, scoreHistory: [...p.scoreHistory, earned], totalScore: p.totalScore + earned };
      })
    );
    playVerdict(isCorrect);
  };

  // ---- Round actions ----
  const handleSetTarget = (role: TargetRole) => {
    setTargetRoleToCatch(role);
    if (isOnline) sendRoomAction({ type: 'SET_TARGET_ROLE', roomId: activeRoom!.id, targetRole: role });
  };

  const handleAccuse = (suspectId: string) => {
    sound.playPoliceWhistle();
    if (isOnline) {
      sendRoomAction({ type: 'ACCUSE_SUSPECT', roomId: activeRoom!.id, suspectPlayerId: suspectId, targetRole: targetRoleToCatch });
    }
    else resolveLocalAccusation(suspectId, targetRoleToCatch);
  };

  const handleNextRound = () => {
    sound.playChitDrop();
    if (isOnline) {
      sendRoomAction({ type: 'NEXT_ROUND', roomId: activeRoom!.id });
    } else if (currentRound >= totalRounds) {
      sound.playVictory();
      setPhase('scoreboard');
    } else {
      dealLocalRound(currentRound + 1, players);
    }
  };

  // Bot police (local modes): think for a moment, then accuse.
  const police = players.find((p) => p.role === 'police');
  const botPoliceActive = phase === 'playing' && roundPhase === 'interrogation' && !!police?.isBot;

  useEffect(() => {
    if (!botPoliceActive || isOnline) return;
    const target: TargetRole = Math.random() < 0.5 ? 'chor' : 'dakat';
    setTargetRoleToCatch(target);
    const t = setTimeout(() => {
      const suspects = players.filter((p) => isSuspectRole(p.role));
      const correct = suspects.find((p) => p.role === target)!;
      const wrong = suspects.find((p) => p.role !== target)!;
      sound.playPoliceWhistle();
      resolveLocalAccusation(Math.random() < BOT_POLICE_ACCURACY ? correct.id : wrong.id, target);
    }, BOT_POLICE_THINK_MS);
    return () => clearTimeout(t);
    // Runs once per dealt round; players/roles are fixed for that round
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botPoliceActive, dealId, isOnline]);

  // Online: the server has no timers, so nudge it with TICK once a deadline passes
  // (police turn, auto next round) or while the police has gone offline.
  const onlineDeadline = roundPhase === 'resolved' ? roomTimers.nextRoundAt : roomTimers.turnDeadline;
  const policeOffline = roundPhase === 'interrogation' && police?.isOnline === false;
  useEffect(() => {
    if (!isOnline || phase !== 'playing' || !onlineDeadline) return;
    const roomId = activeRoom!.id;
    const tick = () => sendRoomAction({ type: 'TICK', roomId });
    let retry: ReturnType<typeof setInterval> | undefined;
    const wait = policeOffline ? 3000 : Math.max(0, onlineDeadline - connRef.current!.serverNow()) + 150;
    const t = setTimeout(() => {
      tick();
      retry = setInterval(tick, 2500);
    }, wait);
    return () => {
      clearTimeout(t);
      clearInterval(retry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, phase, onlineDeadline, policeOffline, activeRoom?.id]);

  const toLocalTime = (serverTime?: number) =>
    serverTime === undefined ? undefined : serverTime - (connRef.current?.serverOffset ?? 0);

  const handleReact = (text: string) => {
    if (isOnline) sendRoomAction({ type: 'REACT', roomId: activeRoom!.id, text });
  };
  const handleRematch = () => {
    sound.playChitDrop();
    if (activeRoom) sendRoomAction({ type: 'REMATCH', roomId: activeRoom.id });
  };

  // ---- Online hub actions ----
  const handleCreateRoom = (roomName: string, rounds: number, fillBots: boolean) =>
    sendRoomAction({
      type: 'CREATE_ROOM',
      roomName,
      totalRounds: rounds,
      isPublic: true,
      fillWithBots: fillBots,
      hostPlayer: me,
    });
  const handleJoinRoom = (roomId: string) => sendRoomAction({ type: 'JOIN_ROOM', roomId, player: me });
  const handleJoinMatchmaking = () => sendRoomAction({ type: 'JOIN_MATCHMAKING', player: me });
  const handleCancelMatchmaking = () => {
    sendRoomAction({ type: 'LEAVE_MATCHMAKING' });
    setIsMatchmakingActive(false);
  };
  const handleStartWaitingRoom = () => activeRoom && sendRoomAction({ type: 'START_GAME', roomId: activeRoom.id });

  // ---- Profile / chrome ----
  const handleSaveProfile = (newName: string, newEmoji: string, newX: string, newY: string, newZ: string) => {
    setPlayerName(newName);
    setPlayerEmoji(newEmoji);
    setBotNames([newX, newY, newZ]);
    writeStore('cpdb_player_name', newName);
    writeStore('cpdb_player_emoji', newEmoji);
    writeStore('cpdb_player_x', newX);
    writeStore('cpdb_player_y', newY);
    writeStore('cpdb_player_z', newZ);

    // Rename seats in a running bot match; other modes own their names
    if (gameMode !== 'vsBots') return;
    const names: Record<string, [string, string?]> = {
      [playerId]: [newName, newEmoji],
      'bot-1': [newX],
      'bot-2': [newY],
      'bot-3': [newZ],
    };
    setPlayers((prev) =>
      prev.map((p) =>
        names[p.id] ? { ...p, name: names[p.id][0], avatarEmoji: names[p.id][1] ?? p.avatarEmoji } : p
      )
    );
  };

  const handleSetBgTheme = (theme: BgTheme) => {
    setBgTheme(theme);
    writeStore('cpdb_bg_theme', theme);
  };

  const handleToggleMute = () => setIsMuted(sound.toggleMute());

  const handleCopyRoomLink = async () => {
    if (!activeRoom) return;
    const url = roomUrl(activeRoom.id);
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'চোর-পুলিশ-ডাকাত-বাবু', text: `রুম কোড: ${activeRoom.id}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') showToast(`লিংক কপি করা যায়নি। রুম কোড: ${activeRoom.id}`);
    }
  };

  const goToLobby = () => {
    const question = isOnline ? 'রুম ছেড়ে দেবেন? আপনার আসনে একটি বট বসবে।' : 'চলমান ম্যাচ ছেড়ে লবিতে ফিরে যাবেন?';
    if (phase === 'playing' && !window.confirm(question)) return;
    leaveOnlineRoom();
    setPhase('lobby');
  };

  const openScoreDrawer = () => {
    sound.playPaperRustle();
    setModal('score');
  };
  const closeModal = () => setModal(null);

  return (
    <div className={`min-h-dvh theme-${bgTheme} text-amber-100 flex flex-col transition-colors duration-500`}>
      <header className="sticky top-0 z-40 w-full border-b border-amber-900/60 bg-black/70 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 px-3 sm:px-6 py-2">
          <button type="button" onClick={goToLobby} className="flex items-center gap-2 group shrink-0 text-left" aria-label="লবিতে ফিরুন">
            <div className="w-9 h-9 rounded-lg bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 font-black text-lg">
              ব
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-black text-amber-100 tracking-tight group-hover:text-amber-300 transition-colors">
                চোর-পুলিশ-ডাকাত-বাবু
              </div>
              <div className="text-[11px] text-amber-400/80">৪ বন্ধু ৪ পাশে · নস্টালজিক চিরকুট</div>
            </div>
          </button>

          {activeRoom && (
            <div className="flex items-center gap-1 p-1 bg-amber-950/90 border border-amber-700/80 rounded-lg text-xs font-mono min-w-0">
              <span className="text-[11px] text-amber-500 hidden sm:inline pl-1">রুম:</span>
              <strong className="text-amber-300 px-1">{activeRoom.id}</strong>
              <button
                type="button"
                onClick={handleCopyRoomLink}
                className="p-1.5 bg-amber-800 hover:bg-amber-700 rounded text-amber-200 transition-colors flex items-center gap-1"
                aria-label="রুমের আমন্ত্রণ লিংক শেয়ার করুন"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">{copiedLink ? 'কপি হয়েছে' : 'শেয়ার'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden xs:flex items-center gap-1 p-1 bg-black/60 border border-amber-800/60 rounded-full" role="radiogroup" aria-label="ব্যাকগ্রাউন্ড রঙ">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={bgTheme === t.id}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => handleSetBgTheme(t.id)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    bgTheme === t.id ? 'border-amber-200 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.swatch }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setModal('profile')}
              className="px-2 sm:px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 rounded-lg text-xs font-bangla-hand font-bold text-amber-200 transition-colors flex items-center gap-1.5"
              aria-label="প্রোফাইল ও নাম পরিবর্তন"
            >
              <span aria-hidden>{playerEmoji}</span>
              <span className="max-w-[72px] sm:max-w-[110px] truncate">{playerName}</span>
            </button>

            <button
              type="button"
              onClick={() => setModal('online')}
              className="p-1.5 md:px-2.5 bg-blue-900/70 hover:bg-blue-800 border border-blue-500/60 rounded-lg text-xs text-blue-200 transition-colors flex items-center gap-1"
              aria-label="অনলাইন রুম"
            >
              <Globe className="w-4 h-4 text-blue-300" />
              <span className="hidden md:inline font-bold">অনলাইন</span>
            </button>

            <button
              type="button"
              onClick={() => setModal('rules')}
              className="p-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-lg text-amber-200 transition-colors"
              aria-label="নিয়মাবলী"
              title="নিয়মাবলী"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-lg text-amber-200 transition-colors"
              aria-label={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
              aria-pressed={isMuted}
              title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {isOnline && !isConnected && (
        <div role="status" className="sticky top-[53px] z-30 w-full bg-amber-500 text-amber-950 text-sm font-bold text-center py-1.5 px-3">
          ⏳ সংযোগ বিচ্ছিন্ন — আবার চেষ্টা করা হচ্ছে…
        </div>
      )}

      {toast && (
        <div
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md px-4 py-2.5 border-2 rounded-xl shadow-2xl text-sm font-bangla-hand flex items-center gap-2 anim-drop ${
            toast.tone === 'error' ? 'bg-rose-900 border-rose-500 text-rose-100' : 'bg-emerald-900 border-emerald-500 text-emerald-50'
          }`}
        >
          <span className="flex-1">{toast.tone === 'error' ? '⚠️ ' : ''}{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="text-rose-300 hover:text-white font-bold px-1" aria-label="বন্ধ করুন">
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center">
        {phase === 'lobby' && (
          <div className="w-full max-w-3xl flex flex-col items-center text-center my-auto anim-fade">
            <button
              type="button"
              onClick={() => setModal('profile')}
              className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-300 text-sm font-bangla-hand mb-3 transition-colors"
            >
              <span>
                খেলোয়াড়: {playerEmoji} {playerName}
              </span>
              <span className="text-amber-400 underline text-xs">নাম বদলান</span>
            </button>

            <h1 className="text-4xl sm:text-6xl font-black text-amber-100 tracking-tight mb-2 drop-shadow">
              চোর পুলিশ ডাকাত বাবু
            </h1>
            <p className="text-amber-200/70 text-sm sm:text-base mb-5 font-bangla-hand">
              চিরকুট খুলুন, বাবু-পুলিশ প্রকাশ্যে — পুলিশ ধরবে চোর না ডাকাত?
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-7 text-sm font-bangla-hand">
              {(['babu', 'police', 'dakat', 'chor'] as RoleType[]).map((r) => (
                <span key={r} className={`role-chip role-chip-${r}`}>
                  {ROLE_DEFINITIONS[r].emoji} {ROLE_DEFINITIONS[r].nameBn}: {toBn(ROLE_DEFINITIONS[r].points)}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6">
              <ModeCard
                onClick={handleStartBotMatch}
                tone="amber"
                icon={<Bot className="w-5 h-5" />}
                title="১ জন + ৩ জন বট"
                body={`${botNames.join(', ')} চার পাশে বসে দ্রুত খেলবে।`}
                cta="এখনই খেলা শুরু"
              />
              <ModeCard
                onClick={() => setModal('passAndPlay')}
                tone="emerald"
                icon={<Users className="w-5 h-5" />}
                title="পাস অ্যান্ড প্লে (৪ বন্ধু)"
                body="একই স্ক্রিনে চার বন্ধু বসে খেলুন। শুধু বাবু ও পুলিশ প্রকাশ পাবে!"
                cta="বন্ধুদের নাম সেট করুন"
              />
              <ModeCard
                onClick={() => setModal('online')}
                tone="blue"
                icon={<Globe className="w-5 h-5" />}
                title="অনলাইন রুম"
                body="রুম কোড দিয়ে বন্ধুদের ডাকুন বা র্যান্ডম ৪ জন একসাথে খেলুন।"
                cta="রুম হাব খুলুন"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 p-2.5 bg-black/50 border border-amber-900/60 rounded-xl text-sm" role="radiogroup" aria-label="বট ম্যাচের রাউন্ড">
              <span className="text-amber-300 font-bold px-1">বট ম্যাচের রাউন্ড:</span>
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={totalRounds === r}
                  onClick={() => setTotalRounds(r)}
                  className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                    totalRounds === r ? 'bg-amber-500 text-slate-950 shadow' : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900'
                  }`}
                >
                  {toBn(r)} রাউন্ড
                </button>
              ))}
            </div>

            <button type="button" onClick={() => setModal('rules')} className="mt-4 text-sm text-amber-300/80 hover:text-amber-200 underline underline-offset-4">
              প্রথমবার খেলছেন? নিয়মগুলো দেখে নিন
            </button>
          </div>
        )}

        {phase === 'playing' && players.length === 4 && (
          <FourPlayerTable
            players={players}
            humanPlayerId={playerId}
            gameMode={gameMode}
            targetRoleToCatch={targetRoleToCatch}
            onSetTargetRoleToCatch={handleSetTarget}
            onAccuseSuspect={handleAccuse}
            isBotPoliceThinking={botPoliceActive}
            roundPhase={roundPhase}
            accusedPlayerId={accusedPlayerId}
            isCorrectGuess={isCorrectGuess}
            onNextRound={handleNextRound}
            onOpenScoreKhata={openScoreDrawer}
            currentRound={currentRound}
            totalRounds={totalRounds}
            roomName={isOnline ? activeRoom!.name : undefined}
            turnEndsAt={isOnline && roundPhase === 'interrogation' ? toLocalTime(roomTimers.turnDeadline) : undefined}
            nextRoundAt={isOnline && roundPhase === 'resolved' ? toLocalTime(roomTimers.nextRoundAt) : undefined}
            wasAutoAccused={isOnline && !!roomTimers.wasAutoAccused}
            reactions={isOnline ? reactions : undefined}
            serverOffset={connRef.current?.serverOffset ?? 0}
            onReact={handleReact}
            onLeave={isOnline ? goToLobby : undefined}
          />
        )}

        {phase === 'scoreboard' && (
          <NotebookScoreboard
            players={players}
            totalRounds={totalRounds}
            onResetMatch={() => {
              leaveOnlineRoom();
              setPhase('lobby');
            }}
            onPlayAgain={gameMode === 'online' ? (activeRoom ? handleRematch : undefined) : handlePlayAgain}
            playAgainLabel={gameMode === 'online' ? 'একই রুমে রিম্যাচ' : undefined}
          />
        )}
      </main>

      {modal === 'score' && (
        <SideScoreDrawer onClose={closeModal} players={players} currentRound={currentRound} totalRounds={totalRounds} />
      )}
      {modal === 'passAndPlay' && (
        <PassAndPlaySetupModal
          onClose={closeModal}
          onStartPassAndPlay={handleStartPassAndPlay}
          initialNames={[playerName, ...botNames]}
          initialRounds={totalRounds}
        />
      )}
      {modal === 'online' && (
        <OnlineRoomHub
          onClose={closeModal}
          playerId={playerId}
          playerName={playerName}
          playerEmoji={playerEmoji}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onJoinMatchmaking={handleJoinMatchmaking}
          matchmakingWaitingCount={matchmakingWaitingCount}
          isMatchmakingActive={isMatchmakingActive}
          onCancelMatchmaking={handleCancelMatchmaking}
          waitingRoom={activeRoom?.status === 'waiting' ? activeRoom : null}
          onStartWaitingRoom={handleStartWaitingRoom}
          onLeaveWaitingRoom={leaveOnlineRoom}
          onShareRoom={handleCopyRoomLink}
        />
      )}
      {modal === 'profile' && (
        <PlayerProfileModal
          onClose={closeModal}
          currentName={playerName}
          currentEmoji={playerEmoji}
          nameX={botNames[0]}
          nameY={botNames[1]}
          nameZ={botNames[2]}
          onSaveProfile={handleSaveProfile}
        />
      )}
      {modal === 'rules' && <RulesModal onClose={closeModal} />}
    </div>
  );
}

const MODE_TONES = {
  amber: 'bg-amber-950/80 hover:bg-amber-900/80 border-amber-800/80 hover:border-amber-400 [--accent:var(--color-amber-300)]',
  emerald: 'bg-emerald-950/80 hover:bg-emerald-900/80 border-emerald-800/80 hover:border-emerald-400 [--accent:var(--color-emerald-300)]',
  blue: 'bg-blue-950/80 hover:bg-blue-900/80 border-blue-700/80 hover:border-blue-400 [--accent:var(--color-blue-300)]',
};

const ModeCard: React.FC<{
  onClick: () => void;
  tone: keyof typeof MODE_TONES;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
}> = ({ onClick, tone, icon, title, body, cta }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group p-5 border-2 rounded-2xl text-left transition-all hover:-translate-y-0.5 hover:shadow-xl flex flex-col justify-between ${MODE_TONES[tone]}`}
  >
    <div>
      <div className="w-10 h-10 rounded-xl bg-white/10 text-(--accent) flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-white mb-1 group-hover:text-(--accent) transition-colors">{title}</h2>
      <p className="text-sm text-amber-100/70 font-bangla-hand leading-relaxed">{body}</p>
    </div>
    <div className="mt-3 flex items-center gap-1 text-sm font-bold text-(--accent)">
      <span>{cta}</span>
      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);
