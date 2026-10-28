import React, { useState, useEffect, useRef } from 'react';
import { PaperPlayer, RoleType, GameMode } from './types/game';
import { ROLE_DEFINITIONS, BLUFF_REACTIONS } from './utils/constants';
import { sound } from './utils/audio';
import { FourPlayerTable } from './components/FourPlayerTable';
import { SideScoreDrawer } from './components/SideScoreDrawer';
import { NotebookScoreboard } from './components/NotebookScoreboard';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { PassAndPlaySetupModal } from './components/PassAndPlaySetupModal';
import { OnlineRoomHub } from './components/OnlineRoomHub';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Bot,
  RotateCcw,
  Sparkles,
  ArrowRight,
  FileText,
  Share2,
  Check,
  Globe,
  User,
  Users,
} from 'lucide-react';

export default function App() {
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());

  // Player Profile with persistence
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('cpdb_player_name') || 'আপনি';
  });
  const [playerEmoji, setPlayerEmoji] = useState(() => {
    return localStorage.getItem('cpdb_player_emoji') || '🧑‍🎓';
  });
  const [playerId] = useState(() => {
    let id = localStorage.getItem('cpdb_player_id');
    if (!id) {
      id = 'user-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('cpdb_player_id', id);
    }
    return id;
  });

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPassAndPlayModalOpen, setIsPassAndPlayModalOpen] = useState(false);
  const [isRoomHubOpen, setIsRoomHubOpen] = useState(false);
  const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Match State
  const [gameMode, setGameMode] = useState<GameMode>('vsBots');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState<string | null>(null);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'scoreboard' | 'finished'>('lobby');

  // Round phase: 'interrogation' (Babu & Police revealed, Chor & Dakat hidden) -> 'resolved' (all revealed)
  const [roundPhase, setRoundPhase] = useState<'interrogation' | 'resolved'>('interrogation');

  const [targetRoleToCatch, setTargetRoleToCatch] = useState<'chor' | 'dakat'>('dakat');

  // Matchmaking State
  const [isMatchmakingActive, setIsMatchmakingActive] = useState(false);
  const [matchmakingWaitingCount, setMatchmakingWaitingCount] = useState(1);

  // Players in 4 seats (South, West, North, East)
  const [players, setPlayers] = useState<PaperPlayer[]>([
    {
      id: playerId,
      name: playerName,
      isBot: false,
      avatarEmoji: playerEmoji,
      role: 'babu',
      chitIndex: 0,
      hasSeenChit: true,
      currentReaction: BLUFF_REACTIONS[0].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    },
    {
      id: 'bot-1',
      name: 'রহিম (বট)',
      isBot: true,
      avatarEmoji: '👦',
      role: 'police',
      chitIndex: 1,
      hasSeenChit: true,
      currentReaction: BLUFF_REACTIONS[1].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    },
    {
      id: 'bot-2',
      name: 'করিম (বট)',
      isBot: true,
      avatarEmoji: '🧔',
      role: 'dakat',
      chitIndex: 2,
      hasSeenChit: true,
      currentReaction: BLUFF_REACTIONS[2].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    },
    {
      id: 'bot-3',
      name: 'ফাতেমা (বট)',
      isBot: true,
      avatarEmoji: '👧',
      role: 'chor',
      chitIndex: 3,
      hasSeenChit: true,
      currentReaction: BLUFF_REACTIONS[3].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    },
  ]);

  const [accusedPlayerId, setAccusedPlayerId] = useState<string | null>(null);
  const [isCorrectGuess, setIsCorrectGuess] = useState(false);
  const [isBotPoliceThinking, setIsBotPoliceThinking] = useState(false);
  const [botPoliceThoughtText, setBotPoliceThoughtText] = useState<string | null>(null);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        ws.send(
          JSON.stringify({
            type: 'JOIN_ROOM',
            roomId: roomParam,
            player: { id: playerId, name: playerName, avatarEmoji: playerEmoji },
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ROOM_STATE' && data.room) {
          const room = data.room;
          setActiveRoomId(room.id);
          setActiveRoomName(room.name);
          setTotalRounds(room.totalRounds);
          setCurrentRound(room.currentRound);
          setRoundPhase(room.roundPhase === 'resolved' ? 'resolved' : 'interrogation');
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
              chitIndex: rp.seatIndex,
              hasSeenChit: true,
              currentReaction: rp.currentReaction,
              currentDialogue: rp.currentDialogue,
              scoreHistory: rp.scoreHistory || [],
              totalScore: rp.totalScore || 0,
            }))
          );

          if (room.status === 'playing') {
            setPhase('playing');
            setIsRoomHubOpen(false);
          } else if (room.status === 'finished') {
            setPhase('scoreboard');
          }
        } else if (data.type === 'MATCHMAKING_STATUS') {
          setIsMatchmakingActive(true);
          setMatchmakingWaitingCount(data.waitingCount || 1);
        } else if (data.type === 'ERROR') {
          alert(data.message);
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };

    wsRef.current = ws;
    return () => {
      ws.close();
    };
  }, [playerId, playerName, playerEmoji]);

  // Profile Save
  const handleSaveProfile = (newName: string, newEmoji: string) => {
    setPlayerName(newName);
    setPlayerEmoji(newEmoji);
    localStorage.setItem('cpdb_player_name', newName);
    localStorage.setItem('cpdb_player_emoji', newEmoji);

    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, name: newName, avatarEmoji: newEmoji } : p))
    );
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleCopyRoomLink = () => {
    if (!activeRoomId) return;
    const shareUrl = `${window.location.origin}?room=${activeRoomId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Start Offline Match (1 Human + 3 Bots)
  const handleStartBotMatch = () => {
    setGameMode('vsBots');
    setActiveRoomId(null);
    setCurrentRound(1);
    sound.playChitDrop();

    const initialBotPlayers: PaperPlayer[] = [
      {
        id: playerId,
        name: playerName,
        isBot: false,
        avatarEmoji: playerEmoji,
        role: 'babu',
        chitIndex: 0,
        hasSeenChit: true,
        currentReaction: BLUFF_REACTIONS[0].text,
        currentDialogue: '',
        scoreHistory: [],
        totalScore: 0,
      },
      {
        id: 'bot-1',
        name: 'রহিম (বট)',
        isBot: true,
        avatarEmoji: '👦',
        role: 'police',
        chitIndex: 1,
        hasSeenChit: true,
        currentReaction: BLUFF_REACTIONS[1].text,
        currentDialogue: '',
        scoreHistory: [],
        totalScore: 0,
      },
      {
        id: 'bot-2',
        name: 'করিম (বট)',
        isBot: true,
        avatarEmoji: '🧔',
        role: 'dakat',
        chitIndex: 2,
        hasSeenChit: true,
        currentReaction: BLUFF_REACTIONS[2].text,
        currentDialogue: '',
        scoreHistory: [],
        totalScore: 0,
      },
      {
        id: 'bot-3',
        name: 'ফাতেমা (বট)',
        isBot: true,
        avatarEmoji: '👧',
        role: 'chor',
        chitIndex: 3,
        hasSeenChit: true,
        currentReaction: BLUFF_REACTIONS[3].text,
        currentDialogue: '',
        scoreHistory: [],
        totalScore: 0,
      },
    ];

    startLocalRound(1, initialBotPlayers, true);
    setPhase('playing');
  };

  // Start Pass & Play Match (4 Humans on 1 Device)
  const handleStartPassAndPlay = (customNames: string[], rounds: number) => {
    setGameMode('passAndPlay');
    setActiveRoomId(null);
    setTotalRounds(rounds);
    setCurrentRound(1);
    sound.playChitDrop();

    const emojis = ['🧑‍🎓', '👦', '👧', '🧔'];
    const initialHumanPlayers: PaperPlayer[] = customNames.map((name, idx) => ({
      id: `seat-${idx + 1}`,
      name,
      isBot: false,
      avatarEmoji: emojis[idx],
      role: 'babu',
      chitIndex: idx,
      hasSeenChit: true,
      currentReaction: BLUFF_REACTIONS[idx % BLUFF_REACTIONS.length].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    }));

    startLocalRound(1, initialHumanPlayers, true);
    setPhase('playing');
  };

  const shuffleRoles = (): RoleType[] => {
    const roles: RoleType[] = ['babu', 'police', 'dakat', 'chor'];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
  };

  // Start a local round
  const startLocalRound = (
    roundNum: number,
    basePlayers = players,
    isNewMatch = false
  ) => {
    const roles = shuffleRoles();

    const updatedPlayers = basePlayers.map((player, idx) => {
      const assignedRole = roles[idx];
      const roleDef = ROLE_DEFINITIONS[assignedRole];
      const randomDialogue =
        roleDef.dialogues[Math.floor(Math.random() * roleDef.dialogues.length)];
      const randomReaction =
        BLUFF_REACTIONS[Math.floor(Math.random() * BLUFF_REACTIONS.length)].text;

      return {
        ...player,
        role: assignedRole,
        hasSeenChit: true,
        currentDialogue: randomDialogue,
        currentReaction: randomReaction,
        scoreHistory: isNewMatch ? [] : player.scoreHistory,
        totalScore: isNewMatch ? 0 : player.totalScore,
      };
    });

    setPlayers(updatedPlayers);
    setAccusedPlayerId(null);
    setIsCorrectGuess(false);
    setIsBotPoliceThinking(false);
    setBotPoliceThoughtText(null);
    setRoundPhase('interrogation');
    setCurrentRound(roundNum);

    // If Bot is Police, trigger AI investigation
    const policePlayer = updatedPlayers.find((p) => p.role === 'police')!;
    if (policePlayer.isBot) {
      triggerBotPoliceDeduction(policePlayer, updatedPlayers);
    }
  };

  // Bot Police AI Investigation
  const triggerBotPoliceDeduction = (police: PaperPlayer, currentPlayersList = players) => {
    setIsBotPoliceThinking(true);
    setBotPoliceThoughtText(
      `দারোগা ${police.name} সন্দেহভাজনদের চোখ ও অভিব্যক্তিতে চোর-ডাকাত খুঁজছেন...`
    );

    setTimeout(() => {
      sound.playPoliceWhistle();
      const suspects = currentPlayersList.filter((p) => p.role !== 'babu' && p.role !== 'police');
      const targetSuspect = suspects.find((p) => p.role === targetRoleToCatch)!;
      const otherSuspect = suspects.find((p) => p.role !== targetRoleToCatch)!;

      // 35% chance to identify target criminal
      const isAccurate = Math.random() < 0.35;
      const chosenSuspect = isAccurate ? targetSuspect : otherSuspect;

      setIsBotPoliceThinking(false);
      setBotPoliceThoughtText(null);
      handleExecuteAccusation(chosenSuspect.id, currentPlayersList);
    }, 2200);
  };

  // Accuse Suspect
  const handleExecuteAccusation = (suspectPlayerId: string, currentPlayersList = players) => {
    if (activeRoomId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'ACCUSE_SUSPECT', roomId: activeRoomId, suspectPlayerId })
      );
    } else {
      const accused = currentPlayersList.find((p) => p.id === suspectPlayerId)!;
      const isCorrect = accused.role === targetRoleToCatch;

      setAccusedPlayerId(suspectPlayerId);
      setIsCorrectGuess(isCorrect);
      setRoundPhase('resolved');

      if (isCorrect) sound.playSuccess();
      else sound.playWrong();
    }
  };

  // Next Round
  const handleNextRound = () => {
    sound.playPenScratch();
    if (activeRoomId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({ type: 'NEXT_ROUND', roomId: activeRoomId })
      );
    } else {
      // Offline calculation per updated points:
      // Babu: 1000
      // Police: 500 if correct, 0 if wrong
      // Dakat: 400 if not caught, 0 if caught
      // Chor: 100 if not caught, 0 if caught
      setPlayers((prev) =>
        prev.map((p) => {
          let earned = 0;
          if (p.role === 'babu') earned = 1000;
          else if (p.role === 'police') earned = isCorrectGuess ? 500 : 0;
          else if (p.role === 'dakat') {
            earned = targetRoleToCatch === 'dakat' && isCorrectGuess && p.id === accusedPlayerId ? 0 : 400;
          } else if (p.role === 'chor') {
            earned = targetRoleToCatch === 'chor' && isCorrectGuess && p.id === accusedPlayerId ? 0 : 100;
          }

          return {
            ...p,
            scoreHistory: [...p.scoreHistory, earned],
            totalScore: p.totalScore + earned,
          };
        })
      );

      if (currentRound >= totalRounds) {
        sound.playVictory();
        setPhase('scoreboard');
      } else {
        sound.playChitDrop();
        startLocalRound(currentRound + 1);
      }
    }
  };

  // Room Hub actions
  const handleCreateRoom = (roomName: string, rounds: number, fillBots: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'CREATE_ROOM',
          roomName,
          totalRounds: rounds,
          isPublic: true,
          fillWithBots: fillBots,
          hostPlayer: { id: playerId, name: playerName, avatarEmoji: playerEmoji },
        })
      );
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_ROOM',
          roomId,
          player: { id: playerId, name: playerName, avatarEmoji: playerEmoji },
        })
      );
    }
  };

  const handleJoinMatchmaking = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_MATCHMAKING',
          player: { id: playerId, name: playerName, avatarEmoji: playerEmoji },
        })
      );
    }
  };

  return (
    <div className="min-h-screen school-desk-bg text-amber-100 flex flex-col font-sans select-none">
      {/* Top Bar with Brand, Name Profile, Room Code, and Quick Actions */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 px-3 sm:px-6 py-2.5 border-b border-amber-900/60 bg-black/45 backdrop-blur-md">
        {/* Brand */}
        <div
          onClick={() => setPhase('lobby')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 font-serif font-black shadow">
            ব
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-black text-amber-100 font-serif tracking-tight group-hover:text-amber-300 transition-colors">
              চোর-পুলিশ-ডাকাত-বাবু
            </h1>
            <div className="text-[10px] text-amber-400/80 font-mono">
              ৪ বন্ধু ৪ পাশে · নস্টালজিক পেপার চিরকুট
            </div>
          </div>
        </div>

        {/* Center Room Code & Share Strip (Active in Room) */}
        {activeRoomId && (
          <div className="flex items-center gap-1.5 p-1 bg-amber-950/90 border border-amber-700/80 rounded-lg text-xs font-mono">
            <span className="text-[10px] text-amber-500 hidden sm:inline">রুম:</span>
            <strong className="text-amber-300 px-1">{activeRoomId}</strong>
            <button
              onClick={handleCopyRoomLink}
              className="p-1 bg-amber-800 hover:bg-amber-700 rounded text-amber-200 transition-colors flex items-center gap-1"
              title="রুমের আমন্ত্রণ লিংক কপি করুন"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              <span className="text-[10px] hidden sm:inline">
                {copiedLink ? 'কপি হয়েছে' : 'শেয়ার'}
              </span>
            </button>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Custom Name Profile Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700 rounded-lg text-xs font-bangla-hand font-bold text-amber-200 transition-colors flex items-center gap-1.5 shadow"
            title="আপনার নাম ও প্রতীক পরিবর্তন করুন"
          >
            <span>{playerEmoji}</span>
            <span className="max-w-[85px] sm:max-w-[120px] truncate">{playerName}</span>
          </button>

          {/* Open Room Hub Button */}
          <button
            onClick={() => setIsRoomHubOpen(true)}
            className="px-2.5 py-1.5 bg-blue-900/70 hover:bg-blue-800 border border-blue-500/60 rounded-lg text-xs font-serif text-blue-200 transition-colors flex items-center gap-1.5 shadow"
            title="অনলাইন রুম ও র্যান্ডম ৪ জন ম্যাচমেকিং"
          >
            <Globe className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline font-bold">অনলাইন রুম</span>
          </button>

          {/* Rules Button */}
          <button
            onClick={() => setIsRulesOpen(true)}
            className="p-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-lg text-amber-200 transition-colors"
            title="নিয়মাবলী"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Sound Mute */}
          <button
            onClick={handleToggleMute}
            className="p-1.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-800 rounded-lg text-amber-200 transition-colors"
            title={isMuted ? 'আনমিউট করুন' : 'মিউট করুন'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Game Surface */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 flex flex-col items-center justify-center">
        {/* SCREEN 1: LOBBY */}
        {phase === 'lobby' && (
          <div className="w-full max-w-2xl flex flex-col items-center text-center my-auto animate-in fade-in duration-300">
            {/* Player Welcome Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-bangla-hand mb-3">
              <span>খেলোয়াড়: {playerEmoji} {playerName}</span>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="text-amber-400 hover:text-white underline text-[11px]"
              >
                (নাম বদলান)
              </button>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-amber-100 font-serif tracking-tight mb-2">
              চোর পুলিশ ডাকাত বাবু
            </h2>

            {/* Points Summary Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs font-bangla-hand">
              <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">
                বাবু: ১০০০
              </span>
              <span className="px-3 py-1 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">
                পুলিশ: ৫০০
              </span>
              <span className="px-3 py-1 bg-rose-950/80 border border-rose-600/60 rounded text-rose-300 font-bold">
                ডাকাত: ৪০০
              </span>
              <span className="px-3 py-1 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">
                চোর: ১০০
              </span>
            </div>

            {/* THREE POLISHED GAME MODES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6 max-w-2xl">
              {/* Play with Bots */}
              <button
                type="button"
                onClick={handleStartBotMatch}
                className="group p-5 bg-amber-950/80 hover:bg-amber-900/80 border-2 border-amber-800/80 hover:border-amber-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-amber-300 transition-colors">
                    ১ জন + ৩ জন বট
                  </h3>
                  <p className="text-[11px] text-amber-300/70 font-bangla-hand leading-relaxed">
                    রহিম, করিম ও ফাতেমা চার পাশে বসে দ্রুত খেলবে।
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-amber-400">
                  <span>তাত্ক্ষণিক খেলা শুরু</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Pass & Play (Updated for 4 friends on 1 device) */}
              <button
                type="button"
                onClick={() => setIsPassAndPlayModalOpen(true)}
                className="group p-5 bg-emerald-950/80 hover:bg-emerald-900/80 border-2 border-emerald-800/80 hover:border-emerald-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-emerald-300 transition-colors">
                    পাস অ্যান্ড প্লে (৪ বন্ধু)
                  </h3>
                  <p className="text-[11px] text-emerald-200/70 font-bangla-hand leading-relaxed">
                    একই স্ক্রিনে চার বন্ধু বসে খেলুন। শুধু বাবু ও পুলিশ প্রকাশ পাবে!
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-300">
                  <span>বন্ধুদের নাম সেট করুন</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Online Room & 4 Players */}
              <button
                type="button"
                onClick={() => setIsRoomHubOpen(true)}
                className="group p-5 bg-blue-950/80 hover:bg-blue-900/80 border-2 border-blue-700/80 hover:border-blue-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-blue-300 transition-colors">
                    অনলাইন রুম ও ৪ জন
                  </h3>
                  <p className="text-[11px] text-blue-200/70 font-bangla-hand leading-relaxed">
                    রুম খুঁজুন, কোড দিয়ে বন্ধুদের ডাকুন বা র্যান্ডম ৪ জন একসাথে খেলুন।
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-300">
                  <span>রুম হাব খুলুন 🚪</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Match Length Selector */}
            <div className="flex items-center gap-3 p-3 bg-black/50 border border-amber-900/60 rounded-xl text-xs font-serif">
              <span className="text-amber-300 font-bold">ম্যাচ রাউন্ড:</span>
              {[3, 5, 10].map((r) => (
                <button
                  key={r}
                  onClick={() => setTotalRounds(r)}
                  className={`px-3 py-1 rounded-md font-mono font-bold transition-all ${
                    totalRounds === r
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900'
                  }`}
                >
                  {r} রাউন্ড
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN 2: 4-PLAYER CARD TABLE (৪ বন্ধু চার পাশে) */}
        {phase === 'playing' && (
          <FourPlayerTable
            players={players}
            humanPlayerId={playerId}
            targetRoleToCatch={targetRoleToCatch}
            onSetTargetRoleToCatch={setTargetRoleToCatch}
            onAccuseSuspect={handleExecuteAccusation}
            isBotPoliceThinking={isBotPoliceThinking}
            botPoliceThoughtText={botPoliceThoughtText}
            roundPhase={roundPhase}
            accusedPlayerId={accusedPlayerId}
            isCorrectGuess={isCorrectGuess}
            onNextRound={handleNextRound}
            currentRound={currentRound}
            totalRounds={totalRounds}
            isPassAndPlay={gameMode === 'passAndPlay'}
          />
        )}

        {/* SCREEN 3: FULL NOTEBOOK SCOREBOARD AT MATCH END */}
        {phase === 'scoreboard' && (
          <NotebookScoreboard
            players={players}
            currentRound={currentRound}
            totalRounds={totalRounds}
            onResetMatch={() => setPhase('lobby')}
            isMatchFinished={true}
          />
        )}
      </main>

      {/* Persistent Floating Side Score Button (Scoreboard for this particular match) */}
      <div className="fixed right-3 bottom-6 z-40">
        <button
          onClick={() => {
            sound.playPaperRustle();
            setIsScoreDrawerOpen(true);
          }}
          className="px-4 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-full font-bangla-hand font-bold text-xs shadow-2xl flex items-center gap-1.5 border-2 border-white/20 transition-transform hover:scale-105 active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>স্কোর খাতা 📓</span>
        </button>
      </div>

      {/* Slide-in Score Drawer for this match */}
      <SideScoreDrawer
        isOpen={isScoreDrawerOpen}
        onClose={() => setIsScoreDrawerOpen(false)}
        players={players}
        currentRound={currentRound}
        totalRounds={totalRounds}
      />

      {/* Pass & Play Setup Modal */}
      <PassAndPlaySetupModal
        isOpen={isPassAndPlayModalOpen}
        onClose={() => setIsPassAndPlayModalOpen(false)}
        onStartPassAndPlay={handleStartPassAndPlay}
        initialNames={[playerName, 'তানভীর', 'সাকিব', 'রাকিব']}
      />

      {/* Online Room Hub Modal */}
      <OnlineRoomHub
        isOpen={isRoomHubOpen}
        onClose={() => setIsRoomHubOpen(false)}
        playerName={playerName}
        playerEmoji={playerEmoji}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onJoinMatchmaking={handleJoinMatchmaking}
        matchmakingWaitingCount={matchmakingWaitingCount}
        isMatchmakingActive={isMatchmakingActive}
        onCancelMatchmaking={() => setIsMatchmakingActive(false)}
      />

      {/* Player Profile Modal */}
      <PlayerProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentName={playerName}
        currentEmoji={playerEmoji}
        onSaveProfile={handleSaveProfile}
      />

      {/* Rules Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl notebook-ruled-page p-6 sm:p-8 rounded-xl shadow-2xl border border-amber-300 text-slate-900 font-serif">
            <h3 className="text-xl font-bold ink-blue-text mb-2 border-b border-blue-300 pb-2">
              আপডেট করা চরিত্র ও পয়েন্ট বিন্যাস 📜
            </h3>
            <div className="space-y-3 text-xs sm:text-sm leading-relaxed font-bangla-hand">
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <strong>👑 বাবু (Babu) — ১০০০ পয়েন্ট:</strong>
                <div>চিরকুট পাওয়ার পর সবার সামনে প্রকাশ পাবে। বাবুর পয়েন্ট নিশ্চিত।</div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <strong>👮‍♂️ পুলিশ (Police) — ৫০০ পয়েন্ট:</strong>
                <div>বাবু ও পুলিশের কার্ড উন্মোচিত থাকবে। পুলিশ বাকি দুজনের মধ্যে চোর অথবা ডাকাতকে সনাক্ত করবে। সঠিক হলে ৫০০, ভুল হলে ০ পয়েন্ট।</div>
              </div>

              <div className="p-3 bg-rose-50 rounded border border-rose-200">
                <strong>🗡️ ডাকাত (Dakat) — ৪০০ পয়েন্ট:</strong>
                <div>কার্ড গোপন থাকবে। পুলিশ ভুল অনুমানে ধরতে না পারলে এই ৪০০ পয়েন্ট নিশ্চিত থাকবে।</div>
              </div>

              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <strong>🥷 চোর (Chor) — ১০০ পয়েন্ট:</strong>
                <div>কার্ড গোপন থাকবে। পুলিশ ভুল অনুমানে ধরতে না পারলে এই ১০০ পয়েন্ট নিশ্চিত থাকবে।</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsRulesOpen(false)}
                className="px-5 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg text-xs"
              >
                বুঝেছি, খেলা চালিয়ে যাই
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
