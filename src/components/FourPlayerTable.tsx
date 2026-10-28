import React from 'react';
import { PaperPlayer, RoleType } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/constants';
import { sound } from '../utils/audio';
import { Crown, Shield, Search, CheckCircle2, XCircle, ArrowRight, HelpCircle } from 'lucide-react';

interface FourPlayerTableProps {
  players: PaperPlayer[];
  humanPlayerId: string;
  targetRoleToCatch: 'chor' | 'dakat';
  onSetTargetRoleToCatch: (role: 'chor' | 'dakat') => void;
  onAccuseSuspect: (suspectPlayerId: string) => void;
  isBotPoliceThinking: boolean;
  botPoliceThoughtText: string | null;
  roundPhase: 'interrogation' | 'resolved';
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  onNextRound: () => void;
  onOpenScoreKhata?: () => void;
  currentRound: number;
  totalRounds: number;
  isPassAndPlay?: boolean;
}

export const FourPlayerTable: React.FC<FourPlayerTableProps> = ({
  players,
  humanPlayerId,
  targetRoleToCatch,
  onSetTargetRoleToCatch,
  onAccuseSuspect,
  isBotPoliceThinking,
  botPoliceThoughtText,
  roundPhase,
  accusedPlayerId,
  isCorrectGuess,
  onNextRound,
  onOpenScoreKhata,
  currentRound,
  totalRounds,
  isPassAndPlay = false,
}) => {
  // 4 seats in 4 cardinal directions
  const bottomPlayer = players[0]; // South
  const leftPlayer = players[1];   // West
  const topPlayer = players[2];    // North
  const rightPlayer = players[3];  // East

  const babuPlayer = players.find((p) => p.role === 'babu')!;
  const policePlayer = players.find((p) => p.role === 'police')!;

  // In Pass & Play: any human in the police seat controls the guess.
  // In Bot mode: only human seat (bottom) controls the guess if human is police.
  const isPoliceTurn = isPassAndPlay ? !policePlayer.isBot : policePlayer.id === humanPlayerId;

  // Suspects: strictly Chor and Dakat
  const suspectIds = players
    .filter((p) => p.role === 'chor' || p.role === 'dakat')
    .map((p) => p.id);

  // Render Seat Chit
  const renderSeatChit = (
    player: PaperPlayer,
    seatPosition: 'top' | 'left' | 'right' | 'bottom'
  ) => {
    const roleDef = ROLE_DEFINITIONS[player.role];

    // CRITICAL REQUIREMENT:
    // "you only show 2 card police and babu then who is police then he will select that whos is dakat or chor like this"
    let isRevealed = false;
    if (roundPhase === 'resolved') {
      isRevealed = true; // All cards open after verdict!
    } else if (player.role === 'babu' || player.role === 'police') {
      isRevealed = true; // ONLY Babu and Police are shown publicly during interrogation!
    }

    const isEligibleSuspect =
      roundPhase === 'interrogation' &&
      suspectIds.includes(player.id) &&
      isPoliceTurn;

    const isAccused = accusedPlayerId === player.id;

    return (
      <div className="flex flex-col items-center gap-1.5 relative group">
        {/* Dialogue Bubble for suspects during interrogation */}
        {player.currentDialogue && roundPhase === 'interrogation' && suspectIds.includes(player.id) && (
          <div
            className={`absolute z-30 w-max max-w-[210px] sm:max-w-[280px] bg-white text-slate-900 px-3.5 py-1.5 rounded-xl shadow-2xl border-2 border-slate-300 text-[11px] sm:text-xs font-bangla-hand leading-tight animate-bounce text-center ${
              seatPosition === 'top'
                ? '-top-11 sm:-top-12 left-1/2 -translate-x-1/2'
                : seatPosition === 'left'
                ? '-top-11 sm:-top-12 left-0 sm:left-2'
                : seatPosition === 'right'
                ? '-top-11 sm:-top-12 right-0 sm:right-2'
                : '-top-11 sm:-top-12 left-1/2 -translate-x-1/2'
            }`}
          >
            <span className="font-bold italic select-none">"{player.currentDialogue}"</span>
            <div
              className={`absolute -bottom-1.5 w-3 h-3 bg-white rotate-45 border-b-2 border-r-2 border-slate-300 ${
                seatPosition === 'left'
                  ? 'left-8'
                  : seatPosition === 'right'
                  ? 'right-8'
                  : 'left-1/2 -translate-x-1/2'
              }`}
            />
          </div>
        )}

        {/* The Paper Chit */}
        <div
          onClick={() => {
            if (isEligibleSuspect) {
              sound.playPoliceWhistle();
              onAccuseSuspect(player.id);
            }
          }}
          className={`transition-all duration-300 select-none ${
            isEligibleSuspect
              ? 'cursor-pointer hover:scale-105 ring-4 ring-amber-400 rounded-lg shadow-2xl'
              : ''
          }`}
        >
          {!isRevealed ? (
            /* FOLDED PAPER CHIT (মোড়ানো গোপন চিরকুট) */
            <div className="w-28 sm:w-36 h-20 sm:h-24 paper-chit-crease rounded-sm flex flex-col items-center justify-center p-2 relative shadow-lg">
              <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-900/20" />
              <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-900/20" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-amber-900/20" />

              <HelpCircle className="w-4 h-4 text-amber-800/40 mb-0.5" />
              <span className="text-[10px] font-mono text-blue-900/60 font-bold uppercase tracking-wider">
                [গোপন চিরকুট]
              </span>
              <span className="text-xs font-bold text-amber-950 font-bangla-hand">
                {player.name}
              </span>

              {isEligibleSuspect && (
                <span className="text-[9px] text-amber-950 font-bold bg-amber-300 px-2 py-0.5 rounded-full mt-1 animate-pulse shadow">
                  {targetRoleToCatch === 'dakat' ? 'ডাকাত' : 'চোর'} ঘোষণা করুন 🎯
                </span>
              )}
            </div>
          ) : (
            /* UNFOLDED TORN NOTEBOOK CHIT (উন্মোচিত চিরকুট) */
            <div
              className={`w-32 sm:w-40 h-28 sm:h-34 notebook-ruled-page border-2 rounded-sm shadow-2xl p-2.5 flex flex-col justify-between text-center relative overflow-hidden animate-in zoom-in-95 duration-200 ${
                isAccused
                  ? isCorrectGuess
                    ? 'border-emerald-600 ring-4 ring-emerald-400'
                    : 'border-rose-600 ring-4 ring-rose-400'
                  : player.role === 'babu'
                  ? 'border-emerald-500'
                  : player.role === 'police'
                  ? 'border-blue-500'
                  : 'border-amber-400'
              }`}
            >
              <div className="text-[10px] text-red-700 font-bold border-b border-blue-200 pb-0.5 font-mono truncate">
                {player.name}
              </div>

              <div className="my-auto">
                <div className="text-2xl sm:text-3xl font-extrabold ink-blue-text font-bangla-hand">
                  {roleDef.nameBn}
                </div>
                <div className="text-xs font-bold text-blue-900 font-mono mt-0.5 pen-stamp-circle inline-block px-2 py-0.2 bg-blue-50/70">
                  {roleDef.points} পয়েন্ট
                </div>
              </div>

              <div className="text-[9px] text-blue-950 font-bangla-hand font-bold truncate">
                {roleDef.titleBn}
              </div>
            </div>
          )}
        </div>

        {/* Seat Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-black/75 border border-amber-700/80 rounded-full text-xs font-serif text-amber-200 shadow-lg backdrop-blur-sm">
          <span>{player.avatarEmoji}</span>
          <span className="font-bold">{player.name}</span>
          {player.role === 'police' && isRevealed && (
            <span className="text-blue-400 font-mono text-[10px] font-bold">[দারোগা]</span>
          )}
          {player.role === 'babu' && isRevealed && (
            <span className="text-emerald-400 font-mono text-[10px] font-bold">[বাবু]</span>
          )}
          <span className="text-amber-400 font-mono font-bold ml-1">
            ({player.totalScore} পঃ)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-4 border-amber-950 shadow-2xl bg-amber-950">
      {/* Weathered Wooden School Desk Photo Background */}
      <div
        className="w-full aspect-[4/3] sm:aspect-[16/10] relative p-4 sm:p-6 flex flex-col justify-between"
        style={{
          backgroundImage: `url('/src/assets/images/bangladeshi_school_bench_1793167905184.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />

        {/* Top Header Strip */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="px-3 py-1 bg-black/80 border border-amber-600/60 rounded-lg text-xs font-mono text-amber-300 font-bold backdrop-blur-sm">
            রাউন্ড {currentRound} / {totalRounds}
          </div>

          <div className="px-3 py-1 bg-black/80 border border-amber-600/60 rounded-lg text-xs font-bangla-hand text-amber-200 font-bold backdrop-blur-sm">
            {isPassAndPlay ? 'পাস অ্যান্ড প্লে · ৪ বন্ধু' : '১ জন আসল + ৩ জন বট'} 📐
          </div>
        </div>

        {/* SIDE 1: TOP PLAYER (North) */}
        <div className="relative z-10 flex justify-center mt-4 sm:mt-6 mb-1">
          {renderSeatChit(topPlayer, 'top')}
        </div>

        {/* MIDDLE ROW: LEFT PLAYER · CENTER TABLE ARENA · RIGHT PLAYER */}
        <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4 my-auto">
          {/* Left Player */}
          <div className="shrink-0">
            {renderSeatChit(leftPlayer, 'left')}
          </div>

          {/* CENTER TABLE ACTION ARENA */}
          <div className="flex-1 max-w-md mx-auto p-4 sm:p-5 bg-amber-950/95 border-2 border-amber-600 rounded-2xl shadow-2xl text-center text-amber-100 font-serif backdrop-blur-md">
            {/* PUBLIC REVEAL STATUS: Babu & Police are visible */}
            <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b border-amber-800 text-xs font-bangla-hand">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>বাবু: {babuPlayer.name} (১০০০)</span>
              </span>
              <span className="text-amber-500">·</span>
              <span className="text-blue-400 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>পুলিশ: {policePlayer.name} (৫০০)</span>
              </span>
            </div>

            {/* INTERROGATION PHASE: Police investigates */}
            {roundPhase === 'interrogation' && (
              <div className="space-y-3 animate-in fade-in">
                {/* Target Selection: Police chooses to catch Chor or Dakat */}
                <div>
                  <div className="text-[11px] text-amber-300 font-bold mb-1.5 font-bangla-hand">
                    দারোগা {policePlayer.name} কাকে খুঁজবেন? (Select Target):
                  </div>
                  <div className="inline-flex p-1 bg-black/60 rounded-xl border border-amber-600 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSetTargetRoleToCatch('dakat')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        targetRoleToCatch === 'dakat'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-rose-300 hover:text-white'
                      }`}
                    >
                      ডাকাত খুঁজুন (৪০০ পঃ)
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetTargetRoleToCatch('chor')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        targetRoleToCatch === 'chor'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-purple-300 hover:text-white'
                      }`}
                    >
                      চোর খুঁজুন (১০০ পঃ)
                    </button>
                  </div>
                </div>

                {/* Prompt based on who is Police */}
                {isPoliceTurn ? (
                  <div className="p-2.5 bg-blue-950/80 border border-blue-500/60 rounded-xl text-xs text-blue-200">
                    <div className="font-bold text-amber-300 flex items-center justify-center gap-1 mb-0.5">
                      <Search className="w-3.5 h-3.5" />
                      <span>দারোগা {policePlayer.name}, বাকি দুটি গোপন চিরকুটের একটিতে চাপ দিন!</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-bangla-hand">
                      চিহ্নিত সন্দেহভাজনকে {targetRoleToCatch === 'dakat' ? 'ডাকাত' : 'চোর'} ঘোষণা করুন।
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-blue-950/80 border border-blue-500/60 rounded-xl text-xs text-blue-300 animate-pulse flex items-center justify-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {botPoliceThoughtText ||
                        `দারোগা ${policePlayer.name} সন্দেহভাজন চোর ও ডাকাতকে পরখ করছেন...`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* RESOLVED PHASE: Verdict */}
            {roundPhase === 'resolved' && (
              <div className="space-y-2.5 animate-in zoom-in-95">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  {isCorrectGuess ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>সঠিক অনুমান! অপরাধী ধরা পড়েছে!</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      <span>ভুল অনুমান! আসল অপরাধী পালিয়ে গেছে!</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-amber-200 leading-tight font-bangla-hand">
                  {isCorrectGuess
                    ? `পুলিশ ৫০০ পয়েন্ট পেলেন! ধৃত অপরাধী ০ পয়েন্ট পেলেন।`
                    : `পুলিশ ০ পেলেন! অপরাধীদের পয়েন্ট সুরক্ষিত রইল।`}
                </div>

                {/* Automatic Khata Score Addition Badge */}
                <div className="py-1 px-2.5 bg-emerald-950/70 border border-emerald-500/60 rounded-lg text-[11px] font-bangla-hand text-emerald-300 flex items-center justify-center gap-1.5 shadow-inner">
                  <span>📓 রাউন্ড {currentRound}-এর পয়েন্ট স্বয়ংক্রিয়ভাবে খাতায় যোগ হয়েছে!</span>
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  {onOpenScoreKhata && (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPaperRustle();
                        onOpenScoreKhata();
                      }}
                      className="py-1.5 px-3 bg-amber-900/90 hover:bg-amber-800 text-amber-200 border border-amber-600 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1"
                    >
                      <span>খাতা দেখুন 📓</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      sound.playChitDrop();
                      onNextRound();
                    }}
                    className="py-1.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <span>পরবর্তী রাউন্ড শুরু করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Player */}
          <div className="shrink-0">
            {renderSeatChit(rightPlayer, 'right')}
          </div>
        </div>

        {/* SIDE 4: BOTTOM PLAYER (South) */}
        <div className="relative z-10 flex justify-center mb-1">
          {renderSeatChit(bottomPlayer, 'bottom')}
        </div>
      </div>
    </div>
  );
};
