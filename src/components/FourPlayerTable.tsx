import React from 'react';
import { PaperPlayer, RoleType } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/constants';
import { sound } from '../utils/audio';
import { Crown, Shield, Search, Sparkles, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface FourPlayerTableProps {
  players: PaperPlayer[];
  humanPlayerId: string;
  hasHumanOpenedChit: boolean;
  onOpenHumanChit: () => void;
  babuDeclared: boolean;
  onBabuDeclare: () => void;
  targetRoleToCatch: 'chor' | 'dakat';
  onSetTargetRoleToCatch: (role: 'chor' | 'dakat') => void;
  policeDeclared: boolean;
  onPoliceStepForward: () => void;
  onAccuseSuspect: (suspectPlayerId: string) => void;
  isBotPoliceThinking: boolean;
  botPoliceThoughtText: string | null;
  roundPhase: 'unfold' | 'babuCall' | 'policeSalute' | 'interrogation' | 'resolved';
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  onNextRound: () => void;
  currentRound: number;
  totalRounds: number;
}

export const FourPlayerTable: React.FC<FourPlayerTableProps> = ({
  players,
  humanPlayerId,
  hasHumanOpenedChit,
  onOpenHumanChit,
  babuDeclared,
  onBabuDeclare,
  targetRoleToCatch,
  onSetTargetRoleToCatch,
  policeDeclared,
  onPoliceStepForward,
  onAccuseSuspect,
  isBotPoliceThinking,
  botPoliceThoughtText,
  roundPhase,
  accusedPlayerId,
  isCorrectGuess,
  onNextRound,
  currentRound,
  totalRounds,
}) => {
  // Players arranged in 4 sides:
  // Bottom: You (Player 0)
  // Left: Player 1
  // Top: Player 2
  // Right: Player 3
  const bottomPlayer = players[0]; // Human
  const leftPlayer = players[1];
  const topPlayer = players[2];
  const rightPlayer = players[3];

  const babuPlayer = players.find((p) => p.role === 'babu')!;
  const policePlayer = players.find((p) => p.role === 'police')!;
  const isHumanBabu = bottomPlayer.role === 'babu';
  const isHumanPolice = bottomPlayer.role === 'police';

  // Suspects are players who are not Babu and not Police
  const suspectIds = players
    .filter((p) => p.role !== 'babu' && p.role !== 'police')
    .map((p) => p.id);

  // Helper to render folded or unfolded chit for a player
  const renderSeatChit = (player: PaperPlayer, isBottom: boolean) => {
    const isHuman = player.id === humanPlayerId;
    const roleDef = ROLE_DEFINITIONS[player.role];

    // Visibility logic:
    // Human's chit is visible after they click to unfold.
    // Babu's chit is visible once Babu declares.
    // Police's chit is visible once Police steps forward.
    // Other chits (Chor / Dakat) become visible ONLY after round resolution!
    let isRevealed = false;
    if (roundPhase === 'resolved') {
      isRevealed = true;
    } else if (isHuman && hasHumanOpenedChit) {
      isRevealed = true;
    } else if (babuDeclared && player.role === 'babu') {
      isRevealed = true;
    } else if (policeDeclared && player.role === 'police') {
      isRevealed = true;
    }

    const isEligibleSuspect =
      roundPhase === 'interrogation' &&
      suspectIds.includes(player.id) &&
      isHumanPolice;

    return (
      <div className="flex flex-col items-center gap-1.5 relative group">
        {/* Dialogue Bubble if speaking */}
        {player.currentDialogue && roundPhase === 'interrogation' && suspectIds.includes(player.id) && (
          <div className="absolute -top-12 z-20 max-w-[170px] sm:max-w-[210px] bg-white text-slate-900 px-3 py-1.5 rounded-lg shadow-lg border border-slate-300 text-[11px] font-serif leading-tight animate-bounce">
            <span className="font-semibold italic">"{player.currentDialogue}"</span>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-b border-r border-slate-300" />
          </div>
        )}

        {/* The Paper Chit */}
        <div
          onClick={() => {
            if (isHuman && !hasHumanOpenedChit) {
              sound.playPaperRustle();
              onOpenHumanChit();
            } else if (isEligibleSuspect) {
              onAccuseSuspect(player.id);
            }
          }}
          className={`transition-all duration-300 select-none ${
            isHuman && !hasHumanOpenedChit
              ? 'cursor-pointer hover:scale-105 active:scale-95 animate-pulse'
              : ''
          } ${isEligibleSuspect ? 'cursor-pointer hover:scale-105 ring-2 ring-blue-500 rounded-sm' : ''}`}
        >
          {!isRevealed ? (
            /* Folded paper chit (ভাঁজ করা চিরকুট) */
            <div className="w-28 sm:w-36 h-18 sm:h-22 paper-chit-crease rounded-sm flex flex-col items-center justify-center p-2 relative shadow-md">
              <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-900/15" />
              <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-900/15" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-amber-900/15" />

              <span className="text-[10px] font-mono text-blue-900/40 uppercase tracking-wider">
                [ভাঁজ চিরকুট]
              </span>
              <span className="text-xs font-bold text-amber-950 font-serif">
                {player.name}
              </span>

              {isHuman && !hasHumanOpenedChit && (
                <span className="text-[9px] text-blue-700 font-bold bg-blue-100/80 px-1.5 py-0.2 rounded mt-1">
                  খুলতে চাপুন ✍️
                </span>
              )}
            </div>
          ) : (
            /* Unfolded torn notebook paper chit */
            <div className="w-32 sm:w-40 h-28 sm:h-34 notebook-ruled-page border border-amber-300/80 rounded-sm shadow-xl p-2.5 flex flex-col justify-between text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="text-[10px] text-red-700/80 font-bold border-b border-blue-200 pb-0.5 font-mono truncate">
                {player.name}
              </div>

              <div className="my-auto">
                <div className="text-2xl sm:text-3xl font-extrabold ink-blue-text font-serif">
                  {roleDef.nameBn}
                </div>
                <div className="text-xs font-bold text-blue-900 font-mono mt-0.5 pen-stamp-circle inline-block px-2 py-0.2 bg-blue-50/60">
                  {roleDef.points} পয়েন্ট
                </div>
              </div>

              <div className="text-[9px] text-blue-950/70 italic truncate">
                {roleDef.titleBn}
              </div>
            </div>
          )}
        </div>

        {/* Player Name and Score Tag */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-amber-900/60 rounded-full text-xs font-serif text-amber-200 shadow">
          <span>{player.avatarEmoji}</span>
          <span className="font-bold">{player.name}</span>
          <span className="text-amber-400 font-mono font-bold ml-1">
            ({player.totalScore} পঃ)
          </span>
        </div>

        {/* Accuse button if eligible suspect */}
        {isEligibleSuspect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAccuseSuspect(player.id);
            }}
            className="mt-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow transition-all animate-pulse"
          >
            একেই ধরুন! ⚖️
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-4 border-amber-950 shadow-2xl bg-amber-950">
      {/* Wooden School Desk Photo Background */}
      <div
        className="w-full aspect-[4/3] sm:aspect-[16/10] relative p-4 sm:p-6 flex flex-col justify-between"
        style={{
          backgroundImage: `url('/src/assets/images/bangladeshi_school_bench_1793167905184.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Subtle shadow overlay to ensure high contrast */}
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Round Badge in Top Corner */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="px-3 py-1 bg-black/70 border border-amber-600/60 rounded-lg text-xs font-mono text-amber-300 font-bold backdrop-blur-sm">
            রাউন্ড {currentRound} / {totalRounds}
          </div>

          <div className="px-3 py-1 bg-black/70 border border-amber-600/60 rounded-lg text-xs font-serif text-amber-200 backdrop-blur-sm">
            চার বন্ধু চার পাশে 📐
          </div>
        </div>

        {/* SIDE 1: TOP PLAYER (North) */}
        <div className="relative z-10 flex justify-center">
          {renderSeatChit(topPlayer, false)}
        </div>

        {/* MIDDLE ROW: LEFT PLAYER (West) · CENTER ARENA · RIGHT PLAYER (East) */}
        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 my-auto">
          {/* Left Player */}
          <div className="shrink-0">
            {renderSeatChit(leftPlayer, false)}
          </div>

          {/* CENTER TABLE ACTION ARENA */}
          <div className="flex-1 max-w-md mx-auto p-4 sm:p-5 bg-amber-950/90 border-2 border-amber-700/80 rounded-2xl shadow-2xl text-center text-amber-100 font-serif backdrop-blur-md">
            {/* STEP 1: Waiting to unfold human chit */}
            {roundPhase === 'unfold' && !hasHumanOpenedChit && (
              <div className="space-y-2">
                <div className="text-sm sm:text-base font-bold text-amber-300">
                  চারটি চিরকুট বেঞ্চে ছিটকে পড়েছে! 📜
                </div>
                <p className="text-xs text-amber-200/80">
                  নিচে আপনার ভাঁজ করা চিরকুটে চাপ দিয়ে নিজের ভূমিকা দেখুন।
                </p>
              </div>
            )}

            {/* STEP 2: Chit unfolded, waiting for Babu declaration */}
            {roundPhase === 'unfold' && hasHumanOpenedChit && (
              <div className="space-y-3 animate-in fade-in">
                {isHumanBabu ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto border border-emerald-400">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div className="text-base font-black text-emerald-300">
                      আপনি বাবু মশাই! (১০০০ পয়েন্ট) 👑
                    </div>
                    <p className="text-xs text-amber-200/80">
                      বাবু হিসেবে সবার সামনে ঘোষণা দিয়ে দারোগাকে তলব করুন।
                    </p>
                    <button
                      onClick={() => {
                        sound.playRajaTrumpet();
                        onBabuDeclare();
                      }}
                      className="py-2.5 px-5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg transition-all"
                    >
                      "আমি বাবু মশাই! কে আমার পুলিশ?" 📢
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-amber-300">
                      বাবু মশাইয়ের ঘোষণার অপেক্ষা...
                    </div>
                    <div className="text-xs font-bold text-amber-100">
                      বাবু হলেন <strong>{babuPlayer.name}</strong>!
                    </div>
                    <button
                      onClick={() => {
                        sound.playRajaTrumpet();
                        onBabuDeclare();
                      }}
                      className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                    >
                      বাবুর ঘোষণা শুনুন 📢
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: Babu declared, waiting for Police Salute */}
            {roundPhase === 'babuCall' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-600/60 rounded-lg text-xs text-emerald-200 font-serif">
                  👑 {babuPlayer.name}: <em>"আমি বাবু মশাই! কে আমার পুলিশ? এখনই আসামীকে হাজির করো!"</em>
                </div>

                {isHumanPolice ? (
                  <>
                    <div className="text-xs font-bold text-blue-300">
                      আপনি পুলিশ! (৫০০ পয়েন্ট) 👮‍♂️
                    </div>
                    <p className="text-[11px] text-amber-200/80">
                      হাজিরা দিন এবং আসামী খোঁজার অনুমতি নিন।
                    </p>
                    <button
                      onClick={() => {
                        sound.playPoliceWhistle();
                        onPoliceStepForward();
                      }}
                      className="py-2 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg text-xs shadow transition-all"
                    >
                      "হুজুর, আমি আপনার দারোগা!" 🫡
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      sound.playPoliceWhistle();
                      onPoliceStepForward();
                    }}
                    className="py-2 px-4 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg text-xs shadow transition-all"
                  >
                    দারোগা {policePlayer.name}-এর হাজিরা দেখুন 👮‍♂️
                  </button>
                )}
              </div>
            )}

            {/* STEP 4: Interrogation Phase (জেরা ও সন্দেহভাজনদের সন্ধান) */}
            {roundPhase === 'interrogation' && (
              <div className="space-y-2.5 animate-in fade-in">
                {/* Target Role Selector */}
                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-amber-300">লক্ষ্য আসামী:</span>
                  <div className="inline-flex p-0.5 bg-black/60 rounded-lg border border-amber-700">
                    <button
                      onClick={() => onSetTargetRoleToCatch('chor')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        targetRoleToCatch === 'chor'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-amber-300 hover:text-white'
                      }`}
                    >
                      চোর (১০০ পঃ)
                    </button>
                    <button
                      onClick={() => onSetTargetRoleToCatch('dakat')}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                        targetRoleToCatch === 'dakat'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-amber-300 hover:text-white'
                      }`}
                    >
                      ডাকাত (৪০০ পঃ)
                    </button>
                  </div>
                </div>

                {isHumanPolice ? (
                  <div className="text-xs text-blue-200">
                    <div className="font-bold text-amber-300 flex items-center justify-center gap-1">
                      <Search className="w-3.5 h-3.5" />
                      <span>সন্দেহভাজনদের চিরকুটে চাপ দিয়ে আসল আসামী চিহ্নিত করুন!</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-blue-300 font-medium animate-pulse flex items-center justify-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {botPoliceThoughtText ||
                        `দারোগা ${policePlayer.name} সন্দেহভাজনদের জেরা করছেন...`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Round Resolved Verdict */}
            {roundPhase === 'resolved' && (
              <div className="space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  {isCorrectGuess ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>সঠিক অনুমান! আসামী ধরা পড়েছে!</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>ভুল অনুমান! আসামী পালিয়ে গেল!</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-amber-200/90 leading-tight">
                  {isCorrectGuess
                    ? `পুলিশ ৫০০ পয়েন্ট পেলেন! ধৃত আসামী ০ পয়েন্ট পেলেন।`
                    : `পুলিশ ০ পেলেন! অপরাধীদের পয়েন্ট সুরক্ষিত রইল।`}
                </div>

                <button
                  onClick={() => {
                    sound.playPenScratch();
                    onNextRound();
                  }}
                  className="py-2 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <span>স্কোর খাতায় লিখুন ও পরবর্তী রাউন্ড</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Player */}
          <div className="shrink-0">
            {renderSeatChit(rightPlayer, false)}
          </div>
        </div>

        {/* SIDE 4: BOTTOM PLAYER (You / South) */}
        <div className="relative z-10 flex justify-center">
          {renderSeatChit(bottomPlayer, true)}
        </div>
      </div>
    </div>
  );
};
