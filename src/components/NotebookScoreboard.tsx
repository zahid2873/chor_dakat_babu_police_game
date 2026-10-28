import React from 'react';
import { PaperPlayer } from '../types/game';
import { sound } from '../utils/audio';
import { Trophy, RotateCcw, ArrowRight } from 'lucide-react';

interface NotebookScoreboardProps {
  players: PaperPlayer[];
  currentRound: number;
  totalRounds: number;
  onNextRound?: () => void;
  onResetMatch?: () => void;
  isMatchFinished?: boolean;
}

export const NotebookScoreboard: React.FC<NotebookScoreboardProps> = ({
  players,
  currentRound,
  totalRounds,
  onNextRound,
  onResetMatch,
  isMatchFinished = false,
}) => {
  // Find highest score
  const maxScore = Math.max(...players.map((p) => p.totalScore));

  return (
    <div className="w-full max-w-3xl mx-auto notebook-ruled-page rounded-lg p-5 sm:p-8 border border-amber-300 shadow-2xl relative my-4 text-slate-900">
      {/* Torn Top Edge effect */}
      <div className="absolute -top-2 left-0 right-0 h-3 bg-amber-100/90 torn-paper-edge" />

      {/* Notebook Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b-2 border-red-400 mb-4 text-xs font-mono">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold ink-blue-text font-serif">
            চোর-পুলিশ-ডাকাত-বাবু : স্কোর খাতা 📓
          </h3>
          <div className="text-slate-600 text-[11px] mt-0.5">
            তারিখ: ১৯৯০-এর দশকের মধুর শৈশব · পাতা নং: {currentRound}
          </div>
        </div>

        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-100 border border-blue-400 text-blue-900 font-bold rounded">
            রাউন্ড: {currentRound} / {totalRounds}
          </span>
        </div>
      </div>

      {/* Hand-Drawn Notebook Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse font-serif">
          <thead>
            <tr className="border-b-2 border-blue-900 text-blue-950 font-bold text-center">
              <th className="py-2.5 px-3 border-r border-blue-300 text-left">
                খেলোয়াড় (Player)
              </th>
              {Array.from({ length: currentRound }).map((_, idx) => (
                <th key={idx} className="py-2.5 px-2 border-r border-blue-300 text-blue-800">
                  রাঃ {idx + 1}
                </th>
              ))}
              <th className="py-2.5 px-3 font-extrabold text-blue-900 text-right">
                সর্বমোট (Total)
              </th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => {
              const isWinner = isMatchFinished && player.totalScore === maxScore && maxScore > 0;

              return (
                <tr
                  key={player.id}
                  className="border-b border-blue-200/80 hover:bg-blue-50/40 transition-colors"
                >
                  <td className="py-3 px-3 border-r border-blue-300 font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-base">{player.avatarEmoji}</span>
                    <span>{player.name}</span>
                    {player.isBot && (
                      <span className="text-[10px] text-slate-500 font-mono">[বট]</span>
                    )}
                    {isWinner && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-400 text-amber-950 font-bold">
                        ১ম স্থান 👑
                      </span>
                    )}
                  </td>

                  {Array.from({ length: currentRound }).map((_, rIdx) => {
                    const score = player.scoreHistory[rIdx] ?? '-';
                    return (
                      <td
                        key={rIdx}
                        className="py-3 px-2 border-r border-blue-300 text-center font-mono font-bold text-blue-900"
                      >
                        {score}
                      </td>
                    );
                  })}

                  <td className="py-3 px-3 text-right font-mono font-black text-base text-blue-950">
                    <span
                      className={`inline-block px-2 py-0.5 ${
                        isWinner ? 'pen-stamp-circle bg-amber-100 text-amber-950 font-bold' : ''
                      }`}
                    >
                      {player.totalScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Match Finished Celebration Banner */}
      {isMatchFinished && (
        <div className="mt-6 p-4 bg-amber-100/90 border-2 border-dashed border-amber-600 rounded-lg text-center animate-bounce">
          <div className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" />
            <span>খেলা সমাপ্ত! অভিনন্দন চ্যাম্পিয়ন!</span>
          </div>
          <div className="text-xs text-amber-900 mt-1">
            খাতার হিসেব অনুযায়ী সর্বোচ্চ পয়েন্ট পেয়ে ম্যাচ জয়ী হলেন{' '}
            <strong>{players.find((p) => p.totalScore === maxScore)?.name}</strong>!
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="mt-6 pt-4 border-t border-red-300 flex flex-wrap items-center justify-between gap-3">
        {onResetMatch && (
          <button
            onClick={() => {
              sound.playPaperRustle();
              onResetMatch();
            }}
            className="px-4 py-2 bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-950 rounded-lg text-xs font-bold font-serif flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>নতুন পাতা খুলুন (New Match)</span>
          </button>
        )}

        {onNextRound && !isMatchFinished && (
          <button
            onClick={() => {
              sound.playPenScratch();
              onNextRound();
            }}
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold font-serif flex items-center gap-2 transition-all shadow-md ml-auto"
          >
            <span>পরবর্তী রাউন্ডের চিরকুট ছিটকান</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
