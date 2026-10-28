import React, { useState } from 'react';
import { PaperPlayer, RoleType, GameMode } from './types/game';
import { ROLE_DEFINITIONS, BLUFF_REACTIONS } from './utils/constants';
import { sound } from './utils/audio';
import { FourPlayerTable } from './components/FourPlayerTable';
import { SideScoreDrawer } from './components/SideScoreDrawer';
import { NotebookScoreboard } from './components/NotebookScoreboard';
import { RoomModal } from './components/RoomModal';
import {
  Volume2,
  VolumeX,
  BookOpen,
  Users,
  Bot,
  RotateCcw,
  Sparkles,
  ArrowRight,
  FileText,
  Share2,
} from 'lucide-react';

const SEAT_NAMES = ['আপনি (You)', 'রহিম (Rahim)', 'করিম (Karim)', 'ফাতেমা (Fatima)'];
const SEAT_EMOJIS = ['🧑‍🎓', '👦', '🧔', '👧'];

export default function App() {
  const [isMuted, setIsMuted] = useState(() => sound.getMuted());
  const [gameMode, setGameMode] = useState<GameMode>('vsBots');
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'scoreboard' | 'finished'>('lobby');

  // Round Sub-Phases:
  // 1. 'unfold' -> Chits are on bench folded, human clicks to unfold
  // 2. 'babuCall' -> Babu declared publicly (1000 pts)
  // 3. 'policeSalute' -> Police stepped forward (500 pts)
  // 4. 'interrogation' -> Police examines suspects (Chor 100 / Dakat 400)
  // 5. 'resolved' -> Verdict revealed
  const [roundPhase, setRoundPhase] = useState<
    'unfold' | 'babuCall' | 'policeSalute' | 'interrogation' | 'resolved'
  >('unfold');

  // Modals & Side Drawer
  const [isScoreDrawerOpen, setIsScoreDrawerOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Target role Police is looking for: default 'chor' (100 pts) or 'dakat' (400 pts)
  const [targetRoleToCatch, setTargetRoleToCatch] = useState<'chor' | 'dakat'>('chor');

  // Four players in four sides
  const [players, setPlayers] = useState<PaperPlayer[]>(() =>
    SEAT_NAMES.map((name, idx) => ({
      id: `p-${idx + 1}`,
      name,
      isBot: idx > 0,
      avatarEmoji: SEAT_EMOJIS[idx],
      role: 'babu',
      chitIndex: idx,
      hasSeenChit: false,
      currentReaction: BLUFF_REACTIONS[0].text,
      currentDialogue: '',
      scoreHistory: [],
      totalScore: 0,
    }))
  );

  const [hasHumanOpenedChit, setHasHumanOpenedChit] = useState(false);
  const [babuDeclared, setBabuDeclared] = useState(false);
  const [policeDeclared, setPoliceDeclared] = useState(false);
  const [accusedPlayerId, setAccusedPlayerId] = useState<string | null>(null);
  const [isCorrectGuess, setIsCorrectGuess] = useState(false);
  const [isBotPoliceThinking, setIsBotPoliceThinking] = useState(false);
  const [botPoliceThoughtText, setBotPoliceThoughtText] = useState<string | null>(null);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  // Fair role shuffler for the 4 roles: Babu (1000), Police (500), Dakat (400), Chor (100)
  const shuffleRoles = (): RoleType[] => {
    const roles: RoleType[] = ['babu', 'police', 'dakat', 'chor'];
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    return roles;
  };

  // Start new match
  const handleStartMatch = (mode: GameMode, roomCode?: string) => {
    setGameMode(mode);
    if (roomCode) setActiveRoomCode(roomCode);
    setCurrentRound(1);
    sound.playChitDrop();

    startRound(1, true);
    setPhase('playing');
  };

  // Start a specific round
  const startRound = (roundNum: number, isNewMatch = false) => {
    const roles = shuffleRoles();

    setPlayers((prev) =>
      prev.map((player, idx) => {
        const assignedRole = roles[idx];
        const roleDef = ROLE_DEFINITIONS[assignedRole];
        const randomDialogue =
          roleDef.dialogues[Math.floor(Math.random() * roleDef.dialogues.length)];
        const randomReaction =
          BLUFF_REACTIONS[Math.floor(Math.random() * BLUFF_REACTIONS.length)].text;

        return {
          ...player,
          role: assignedRole,
          hasSeenChit: false,
          currentDialogue: randomDialogue,
          currentReaction: randomReaction,
          scoreHistory: isNewMatch ? [] : player.scoreHistory,
          totalScore: isNewMatch ? 0 : player.totalScore,
        };
      })
    );

    setHasHumanOpenedChit(false);
    setBabuDeclared(false);
    setPoliceDeclared(false);
    setAccusedPlayerId(null);
    setIsCorrectGuess(false);
    setIsBotPoliceThinking(false);
    setBotPoliceThoughtText(null);
    setRoundPhase('unfold');
    setCurrentRound(roundNum);
  };

  // Human clicks to open their folded chit
  const handleOpenHumanChit = () => {
    setHasHumanOpenedChit(true);
    sound.playPaperRustle();
    setPlayers((prev) =>
      prev.map((p) => (p.id === 'p-1' ? { ...p, hasSeenChit: true } : p))
    );
  };

  // Babu Declares "আমি বাবু মশাই! কে আমার পুলিশ?"
  const handleBabuDeclare = () => {
    setBabuDeclared(true);
    setRoundPhase('babuCall');

    // If Babu is a bot and Police is a bot, proceed smoothly
    const police = players.find((p) => p.role === 'police')!;
    if (police.isBot) {
      setTimeout(() => {
        handlePoliceStepForward();
      }, 1200);
    }
  };

  // Police steps forward
  const handlePoliceStepForward = () => {
    setPoliceDeclared(true);
    setRoundPhase('interrogation');

    const police = players.find((p) => p.role === 'police')!;
    if (police.isBot) {
      triggerBotPoliceDeduction(police);
    }
  };

  // AI Police deduction with realistic 30% baseline accuracy
  const triggerBotPoliceDeduction = (police: PaperPlayer) => {
    setIsBotPoliceThinking(true);
    setBotPoliceThoughtText(
      `দারোগা ${police.name} সন্দেহভাজনদের চোখ ও মুখের অভিব্যক্তি পরীক্ষা করছেন...`
    );

    setTimeout(() => {
      sound.playPoliceWhistle();

      // Suspects are Chor and Dakat
      const suspects = players.filter((p) => p.role !== 'babu' && p.role !== 'police');
      const targetSuspect = suspects.find((p) => p.role === targetRoleToCatch)!;
      const otherSuspect = suspects.find((p) => p.role !== targetRoleToCatch)!;

      // 35% chance to guess accurately
      const isAccurate = Math.random() < 0.35;
      const chosenSuspect = isAccurate ? targetSuspect : otherSuspect;

      setIsBotPoliceThinking(false);
      setBotPoliceThoughtText(null);
      handleExecuteAccusation(chosenSuspect.id);
    }, 2200);
  };

  // Execute Accusation
  const handleExecuteAccusation = (suspectPlayerId: string) => {
    const accused = players.find((p) => p.id === suspectPlayerId)!;
    const isCorrect = accused.role === targetRoleToCatch;

    setAccusedPlayerId(suspectPlayerId);
    setIsCorrectGuess(isCorrect);
    setRoundPhase('resolved');

    if (isCorrect) {
      sound.playSuccess();
    } else {
      sound.playWrong();
    }
  };

  // Resolve Round Points per Updated Points Table:
  // - Babu: 1000 pts (guaranteed)
  // - Police: 500 pts if correct, 0 if wrong
  // - Dakat: 400 pts (guaranteed if not caught)
  // - Chor: 100 pts (guaranteed if not caught)
  const handleNextRoundFromTable = () => {
    sound.playPenScratch();

    setPlayers((prev) =>
      prev.map((p) => {
        let earned = 0;
        if (p.role === 'babu') {
          earned = 1000;
        } else if (p.role === 'police') {
          earned = isCorrectGuess ? 500 : 0;
        } else if (p.role === 'dakat') {
          // If Dakat was caught, Dakat gets 0. If not caught, Dakat gets 400.
          if (targetRoleToCatch === 'dakat' && isCorrectGuess && p.id === accusedPlayerId) {
            earned = 0;
          } else {
            earned = 400;
          }
        } else if (p.role === 'chor') {
          // If Chor was caught, Chor gets 0. If not caught, Chor gets 100.
          if (targetRoleToCatch === 'chor' && isCorrectGuess && p.id === accusedPlayerId) {
            earned = 0;
          } else {
            earned = 100;
          }
        }

        const newHistory = [...p.scoreHistory, earned];
        const newTotal = p.totalScore + earned;

        return {
          ...p,
          scoreHistory: newHistory,
          totalScore: newTotal,
        };
      })
    );

    if (currentRound >= totalRounds) {
      sound.playVictory();
      setPhase('scoreboard');
    } else {
      sound.playChitDrop();
      startRound(currentRound + 1);
    }
  };

  return (
    <div className="min-h-screen school-desk-bg text-amber-100 flex flex-col font-sans select-none">
      {/* Top Nostalgic Wooden Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-amber-900/60 bg-black/40 backdrop-blur-sm">
        {/* Brand */}
        <div
          onClick={() => setPhase('lobby')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 font-serif font-black shadow">
            ব
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-amber-100 font-serif tracking-tight group-hover:text-amber-300 transition-colors">
              চোর-পুলিশ-ডাকাত-বাবু
            </h1>
            <div className="text-[10px] text-amber-400/80 font-mono">
              ৪ বন্ধু ৪ পাশে · নস্টালজিক পেপার চিরকুট সংস্করণ
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Side Score Button (পাশে স্কোর দেখার অপশন) */}
          <button
            onClick={() => {
              sound.playPaperRustle();
              setIsScoreDrawerOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-900/70 hover:bg-blue-800 border border-blue-500/60 rounded-lg text-xs font-serif text-blue-200 transition-colors flex items-center gap-1.5 shadow"
            title="স্কোর খাতা দেখুন"
          >
            <FileText className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-bold">স্কোর খাতা 📓</span>
          </button>

          <button
            onClick={() => setIsRulesOpen(true)}
            className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded-lg text-xs font-serif text-amber-200 transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">নিয়ম</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded-lg text-amber-200 transition-colors"
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

      {/* Main Play Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center">
        {/* SCREEN 1: LOBBY */}
        {phase === 'lobby' && (
          <div className="w-full max-w-2xl flex flex-col items-center text-center my-auto animate-in fade-in duration-300">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs font-serif mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>স্কুলের কাঠের বেঞ্চ ও পুরনো খাতার নস্টালজিক খেলা</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-amber-100 font-serif tracking-tight mb-2">
              চোর পুলিশ ডাকাত বাবু
            </h2>

            {/* Points Summary Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs font-serif">
              <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">
                বাবু: ১০০০
              </span>
              <span className="px-2.5 py-1 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">
                পুলিশ: ৫০০
              </span>
              <span className="px-2.5 py-1 bg-rose-950/80 border border-rose-600/60 rounded text-rose-300 font-bold">
                ডাকাত: ৪০০
              </span>
              <span className="px-2.5 py-1 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">
                চোর: ১০০
              </span>
            </div>

            {/* Mode Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-6">
              <button
                type="button"
                onClick={() => handleStartMatch('vsBots')}
                className="group p-5 bg-amber-950/80 hover:bg-amber-900/80 border-2 border-amber-800/80 hover:border-amber-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-amber-300 transition-colors">
                    ১ জন + ৩ জন বট
                  </h3>
                  <p className="text-[11px] text-amber-300/70 font-serif leading-relaxed">
                    রহিম, করিম ও ফাতেমা চার পাশে বসে খেলবে।
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>বেঞ্চে বসুন</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStartMatch('passAndPlay')}
                className="group p-5 bg-amber-950/80 hover:bg-amber-900/80 border-2 border-amber-800/80 hover:border-amber-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-amber-300 transition-colors">
                    পাস অ্যান্ড প্লে
                  </h3>
                  <p className="text-[11px] text-amber-300/70 font-serif leading-relaxed">
                    একই ডিভাইসে চার বন্ধু চার কোণায় বসে খেলুন।
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>বন্ধুদের ডাকুন</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsRoomModalOpen(true)}
                className="group p-5 bg-amber-950/80 hover:bg-amber-900/80 border-2 border-amber-800/80 hover:border-amber-400 rounded-2xl text-left transition-all hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white font-serif mb-1 group-hover:text-amber-300 transition-colors">
                    রুম কোড শেয়ার
                  </h3>
                  <p className="text-[11px] text-amber-300/70 font-serif leading-relaxed">
                    বন্ধুদের সাথে প্রাইভেট কোড দিয়ে খেলুন।
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <span>রুম কোড খুলুন</span>
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

        {/* SCREEN 2: 4-PLAYER CARD TABLE (৪ বন্ধু ৪ পাশে) */}
        {phase === 'playing' && (
          <FourPlayerTable
            players={players}
            humanPlayerId="p-1"
            hasHumanOpenedChit={hasHumanOpenedChit}
            onOpenHumanChit={handleOpenHumanChit}
            babuDeclared={babuDeclared}
            onBabuDeclare={handleBabuDeclare}
            targetRoleToCatch={targetRoleToCatch}
            onSetTargetRoleToCatch={setTargetRoleToCatch}
            policeDeclared={policeDeclared}
            onPoliceStepForward={handlePoliceStepForward}
            onAccuseSuspect={handleExecuteAccusation}
            isBotPoliceThinking={isBotPoliceThinking}
            botPoliceThoughtText={botPoliceThoughtText}
            roundPhase={roundPhase}
            accusedPlayerId={accusedPlayerId}
            isCorrectGuess={isCorrectGuess}
            onNextRound={handleNextRoundFromTable}
            currentRound={currentRound}
            totalRounds={totalRounds}
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

      {/* Floating Side Scoreboard Tab (Persistent on side for quick inspection) */}
      <div className="fixed right-2 bottom-6 z-40">
        <button
          onClick={() => {
            sound.playPaperRustle();
            setIsScoreDrawerOpen(true);
          }}
          className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-full font-serif font-bold text-xs shadow-2xl flex items-center gap-1.5 border-2 border-white/20 transition-transform hover:scale-105 active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>স্কোর খাতা 📓</span>
        </button>
      </div>

      {/* Slide-in Score Drawer */}
      <SideScoreDrawer
        isOpen={isScoreDrawerOpen}
        onClose={() => setIsScoreDrawerOpen(false)}
        players={players}
        currentRound={currentRound}
        totalRounds={totalRounds}
      />

      {/* Room Modal */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        onStartRoomMatch={(code, mode) => {
          setIsRoomModalOpen(false);
          handleStartMatch(mode === 'friends' ? 'roomCode' : 'vsBots', code);
        }}
      />

      {/* Rules Modal */}
      {isRulesOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl notebook-ruled-page p-6 sm:p-8 rounded-xl shadow-2xl border border-amber-300 text-slate-900 font-serif">
            <h3 className="text-xl font-bold ink-blue-text mb-2 border-b border-blue-300 pb-2">
              আপডেট করা চরিত্র ও পয়েন্ট বিন্যাস 📜
            </h3>
            <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <strong>👑 বাবু (Babu) — ১০০০ পয়েন্ট:</strong>
                <div>চিরকুট পাওয়ার পর প্রকাশ পাবে (সর্বোচ্চ পয়েন্ট)। বাবুর পয়েন্ট নিশ্চিত।</div>
              </div>

              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <strong>👮‍♂️ পুলিশ (Police) — ৫০০ পয়েন্ট:</strong>
                <div>চোর ও ডাকাতকে চেনার চেষ্টা করবে। সঠিক অনুমানে ৫০০ পাবে, ভুল করলে ০ পয়েন্ট।</div>
              </div>

              <div className="p-3 bg-rose-50 rounded border border-rose-200">
                <strong>🗡️ ডাকাত (Dakat) — ৪০০ পয়েন্ট:</strong>
                <div>পুলিশ ভুল অনুমানে ধরতে না পারলে এই ৪০০ পয়েন্ট নিশ্চিত থাকবে। ধরা পড়লে ০।</div>
              </div>

              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <strong>🥷 চোর (Chor) — ১০০ পয়েন্ট:</strong>
                <div>পুলিশ ভুল অনুমানে ধরতে না পারলে এই ১০০ পয়েন্ট নিশ্চিত থাকবে। ধরা পড়লে ০।</div>
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
