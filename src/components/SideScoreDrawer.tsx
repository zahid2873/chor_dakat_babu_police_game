import React from 'react';
import { PaperPlayer } from '../types/game';
import { X, Trophy, FileText } from 'lucide-react';
import { sound } from '../utils/audio';

interface SideScoreDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  players: PaperPlayer[];
  currentRound: number;
  totalRounds: number;
}

export const SideScoreDrawer: React.FC<SideScoreDrawerProps> = ({
  isOpen,
  onClose,
  players,
  currentRound,
  totalRounds,
}) => {
  if (!isOpen) return null;

  const maxScore = Math.max(...players.map((p) => p.totalScore));

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-in School Exercise Notebook Panel */}
      <div className="w-full max-w-lg h-full notebook-ruled-page p-6 sm:p-8 shadow-2xl border-l-4 border-amber-800 flex flex-col justify-between text-slate-900 font-serif overflow-y-auto animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-red-400 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-700" />
              <div>
                <h3 className="text-xl font-bold ink-blue-text font-serif">
                  পয়েন্ট খাতা (Score Register) 📓
                </h3>
                <div className="text-slate-600 text-xs font-mono">
                  রাউন্ড: {currentRound} / {totalRounds} · বলপয়েন্ট কালির হিসেব
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Points Rules Summary Box */}
          <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs leading-relaxed text-blue-950">
            <div className="font-bold text-blue-900 mb-1 border-b border-blue-200 pb-1">
              হাতের কাজের নিয়ম ও পয়েন্ট বিন্যাস:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>• 👑 <strong>বাবু</strong>: ১০০০ পয়েন্ট (প্রকাশ্য)</div>
              <div>• 👮‍♂️ <strong>পুলিশ</strong>: ৫০০ পয়েন্ট (তদন্ত)</div>
              <div>• 🗡️ <strong>ডাকাত</strong>: ৪০০ পয়েন্ট (সুরক্ষিত)</div>
              <div>• 🥷 <strong>চোর</strong>: ১০০ পয়েন্ট (সুরক্ষিত)</div>
            </div>
          </div>

          {/* Scores Table */}
          {(() => {
            const displayRoundsCount = Math.max(1, currentRound, ...players.map((p) => p.scoreHistory.length));
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse font-serif">
                  <thead>
                    <tr className="border-b-2 border-blue-900 text-blue-950 font-bold">
                      <th className="py-2 px-2.5 border-r border-blue-300">নাম</th>
                      {Array.from({ length: displayRoundsCount }).map((_, idx) => (
                        <th key={idx} className="py-2 px-2 border-r border-blue-300 text-center font-mono">
                          রাউন্ড {idx + 1}
                        </th>
                      ))}
                      <th className="py-2 px-2.5 text-right font-black text-blue-900 font-mono">
                        মোট স্কোর
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const isTop = player.totalScore === maxScore && maxScore > 0;

                      return (
                        <tr
                          key={player.id}
                          className="border-b border-blue-200/80 hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="py-2.5 px-2.5 border-r border-blue-300 font-bold flex items-center gap-1.5">
                            <span>{player.avatarEmoji}</span>
                            <span className="truncate max-w-[90px] sm:max-w-none">{player.name}</span>
                            {isTop && (
                              <span className="text-[10px] bg-amber-300 text-amber-950 px-1 rounded font-mono font-bold">
                                👑
                              </span>
                            )}
                          </td>

                          {Array.from({ length: displayRoundsCount }).map((_, rIdx) => {
                            const score = player.scoreHistory[rIdx];
                            const isLatestRecorded = rIdx === player.scoreHistory.length - 1 && score !== undefined;

                            return (
                              <td
                                key={rIdx}
                                className={`py-2.5 px-2 border-r border-blue-300 text-center font-mono font-bold ${
                                  isLatestRecorded
                                    ? 'text-blue-700 bg-blue-100/50'
                                    : score !== undefined
                                    ? 'text-blue-950'
                                    : 'text-slate-400 font-normal italic'
                                }`}
                              >
                                {score !== undefined ? (
                                  <span className={isLatestRecorded ? 'underline decoration-blue-400 font-black' : ''}>
                                    {score}
                                  </span>
                                ) : (
                                  <span className="text-[10px]">—</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-2.5 text-right font-mono font-black text-blue-950">
                            <span
                              className={`inline-block px-1.5 py-0.2 ${
                                isTop ? 'pen-stamp-circle bg-amber-100 text-amber-950 font-bold' : ''
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
            );
          })()}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-red-300 flex items-center justify-between text-xs text-slate-600">
          <span>* সর্বোচ্চ পয়েন্টধারী বিজয়ী হবে।</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-colors shadow"
          >
            খাতা বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
