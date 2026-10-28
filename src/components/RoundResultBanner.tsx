import React from 'react';
import { PaperPlayer, RoleType } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/constants';
import { CheckCircle2, XCircle, ArrowRight, ShieldAlert, Trophy } from 'lucide-react';

interface RoundResultBannerProps {
  players: PaperPlayer[];
  accusedPlayerId: string;
  isCorrectGuess: boolean;
  onContinueToScoreboard: () => void;
}

export const RoundResultBanner: React.FC<RoundResultBannerProps> = ({
  players,
  accusedPlayerId,
  isCorrectGuess,
  onContinueToScoreboard,
}) => {
  const accusedPlayer = players.find((p) => p.id === accusedPlayerId)!;
  const actualChor = players.find((p) => p.role === 'chor')!;
  const police = players.find((p) => p.role === 'police')!;

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-amber-950/95 border-2 border-amber-600 rounded-2xl shadow-2xl text-center text-amber-100 font-serif my-4">
      {/* Icon Indicator */}
      <div className="flex justify-center mb-3">
        {isCorrectGuess ? (
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center animate-bounce shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-9 h-9" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-400 text-rose-400 flex items-center justify-center animate-shake shadow-lg shadow-rose-500/20">
            <XCircle className="w-9 h-9" />
          </div>
        )}
      </div>

      {/* Main Verdict Headline */}
      <h3
        className={`text-2xl sm:text-3xl font-black mb-2 ${
          isCorrectGuess ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {isCorrectGuess
          ? 'সাবাশ! চোর হাতেনাতে ধরা পড়েছে!'
          : 'হায় হায়! আসল চোর পালিয়ে গেল!'}
      </h3>

      <p className="text-sm sm:text-base text-amber-200/90 max-w-md mx-auto mb-6 leading-relaxed">
        {isCorrectGuess
          ? `দারোগা ${police.name} নির্ভুলভাবে ${accusedPlayer.name}-কে চোর হিসেবে চিহ্নিত করেছেন।`
          : `দারোগা ${police.name} ভুল করে নিরীহ ${accusedPlayer.name}-কে সন্দেহ করেছিলেন! আসল চোর ছিলেন ${actualChor.name}।`}
      </p>

      {/* Points Distribution Breakdown */}
      <div className="w-full bg-black/40 border border-amber-800/80 rounded-xl p-4 mb-6">
        <div className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-3">
          এই রাউন্ডের অর্জিত পয়েন্ট
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {players.map((p) => {
            const roleDef = ROLE_DEFINITIONS[p.role];
            let awardedPoints = 0;

            if (p.role === 'raja') awardedPoints = 1000;
            else if (p.role === 'babu') awardedPoints = 800;
            else if (p.role === 'police') awardedPoints = isCorrectGuess ? 500 : 0;
            else if (p.role === 'chor') awardedPoints = isCorrectGuess ? 0 : 500;

            return (
              <div
                key={p.id}
                className="p-2.5 bg-amber-950/80 border border-amber-800/80 rounded-lg flex flex-col items-center"
              >
                <span className="text-base mb-0.5">{p.avatarEmoji}</span>
                <span className="font-bold text-white text-xs">{p.name}</span>
                <span className="text-[10px] text-amber-300 font-serif">
                  ({roleDef.nameBn})
                </span>
                <span className="mt-1 font-mono font-black text-sm text-amber-400">
                  +{awardedPoints}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onContinueToScoreboard}
        className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg transition-all inline-flex items-center gap-2"
      >
        <span>স্কোর খাতায় লিখে পরবর্তী ধাপে যান</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
