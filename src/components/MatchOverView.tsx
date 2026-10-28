import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { MatchRanking } from '../types/game';
import { Language, translations } from '../utils/i18n';
import { Trophy, RotateCcw, PlusCircle, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { sound } from '../utils/audio';

interface MatchOverViewProps {
  rankings: MatchRanking[];
  totalRounds: number;
  onPlayAgain: () => void;
  onNewMatch: () => void;
  language: Language;
}

export const MatchOverView: React.FC<MatchOverViewProps> = ({
  rankings,
  totalRounds,
  onPlayAgain,
  onNewMatch,
  language,
}) => {
  const t = translations[language];
  const winners = rankings.filter((r) => r.isWinner);
  const isShared = winners.length > 1;

  useEffect(() => {
    sound.playVictory();
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#0284c7', '#10b981', '#ec4899'],
      });
    } catch {}
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center text-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10">
        <Trophy className="w-8 h-8" />
      </div>

      <div className="text-xs uppercase font-mono tracking-widest text-amber-400 mb-1">
        {t.matchOver} · {t.round} {totalRounds}
      </div>

      <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
        {isShared ? t.sharedWinnerTitle : t.winnerTitle}
      </h2>

      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {t.matchOverReason}
      </p>

      {/* Podium Rankings Table */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-400 text-left uppercase tracking-wider">
          {language === 'bn' ? 'চূড়ান্ত অবস্থান ও মূলধন' : 'Final Standing & Capital'}
        </div>

        <div className="divide-y divide-slate-800/80">
          {rankings.map((item) => (
            <div
              key={item.player.id}
              className={`flex items-center justify-between px-4 py-3.5 transition-colors ${
                item.isWinner ? 'bg-amber-500/10' : 'bg-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                    item.rank === 1
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-900'
                      : item.rank === 3
                      ? 'bg-amber-800 text-amber-100'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  #{item.rank}
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100 text-sm">
                      {item.player.displayName}
                    </span>
                    {item.isWinner && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-black tracking-wide uppercase">
                        {language === 'bn' ? 'বিজয়ী' : 'Winner'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                    <span>
                      {language === 'bn' ? 'সঠিক অনুমান: ' : 'Correct: '}
                      <strong className="text-emerald-400 font-mono">
                        {item.player.stats.correctGuesses}
                      </strong>
                    </span>
                    <span>
                      {language === 'bn' ? 'ধরা পড়েছে: ' : 'Caught: '}
                      <strong className="text-rose-400 font-mono">
                        {item.player.stats.timesCaught}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Balance */}
              <div className="flex items-center gap-1 font-mono font-black text-lg text-amber-400">
                <span>৳</span>
                <span className="tabular-nums">{item.finalBalance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t.playAgain}</span>
        </button>

        <button
          onClick={onNewMatch}
          className="flex-1 py-3 px-6 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.newMatch}</span>
        </button>
      </div>
    </div>
  );
};
