import React from 'react';
import { PaperPlayer } from '../types/game';
import { sound } from '../utils/audio';
import { toBn, topScorers } from '../utils/constants';
import { Trophy, RotateCcw, Play } from 'lucide-react';

interface ScoreTableProps {
  players: PaperPlayer[];
  roundsToShow: number;
  highlightLatest?: boolean;
}

// Ruled-notebook score register shared by the side drawer and the final scoreboard.
export const ScoreTable: React.FC<ScoreTableProps> = ({ players, roundsToShow, highlightLatest = false }) => {
  const leaders = new Set(topScorers(players).map((p) => p.id));
  const rounds = Array.from({ length: Math.max(1, roundsToShow) }, (_, i) => i);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-blue-900 text-blue-950 font-bold">
            <th scope="col" className="py-2 px-2.5 border-r border-blue-300 sticky left-0 bg-[#faf6eb]">
              নাম
            </th>
            {rounds.map((r) => (
              <th key={r} scope="col" className="py-2 px-2 border-r border-blue-300 text-center whitespace-nowrap text-blue-800">
                রাঃ {toBn(r + 1)}
              </th>
            ))}
            <th scope="col" className="py-2 px-2.5 text-right font-black text-blue-900 whitespace-nowrap">
              মোট
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const isLeader = leaders.has(player.id);
            const latest = player.scoreHistory.length - 1;
            return (
              <tr key={player.id} className="border-b border-blue-200/80">
                <th scope="row" className="py-2.5 px-2.5 border-r border-blue-300 font-bold text-slate-800 sticky left-0 bg-[#faf6eb]">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span aria-hidden>{player.avatarEmoji}</span>
                    <span className="truncate max-w-[7rem]">{player.name}</span>
                    {player.isBot && <span className="text-[10px] text-slate-500">[বট]</span>}
                    {isLeader && <span aria-label="শীর্ষে">👑</span>}
                  </span>
                </th>
                {rounds.map((r) => {
                  const score = player.scoreHistory[r];
                  const isLatest = highlightLatest && r === latest;
                  return (
                    <td
                      key={r}
                      className={`py-2.5 px-2 border-r border-blue-300 text-center font-bold ${
                        score === undefined ? 'text-slate-400' : isLatest ? 'text-blue-700 bg-blue-100/60' : 'text-blue-950'
                      }`}
                    >
                      {score === undefined ? '—' : toBn(score)}
                    </td>
                  );
                })}
                <td className="py-2.5 px-2.5 text-right font-black text-blue-950">
                  <span className={`inline-block px-1.5 ${isLeader ? 'pen-stamp-circle bg-amber-100 text-amber-950' : ''}`}>
                    {toBn(player.totalScore)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface NotebookScoreboardProps {
  players: PaperPlayer[];
  totalRounds: number;
  onResetMatch: () => void;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
}

export const NotebookScoreboard: React.FC<NotebookScoreboardProps> = ({
  players,
  totalRounds,
  onResetMatch,
  onPlayAgain,
  playAgainLabel = 'আবার খেলুন',
}) => {
  const winners = topScorers(players);
  const ranked = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const roundsPlayed = Math.max(...players.map((p) => p.scoreHistory.length));

  return (
    <div className="w-full max-w-3xl mx-auto notebook-ruled-page rounded-lg p-5 sm:p-8 border border-amber-300 relative my-4 text-slate-900 anim-pop">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-red-400 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold ink-blue-text">চূড়ান্ত স্কোর খাতা 📓</h2>
          <div className="text-slate-600 text-xs mt-0.5">নব্বইয়ের দশকের মধুর শৈশব</div>
        </div>
        <span className="self-start sm:self-auto px-3 py-1 bg-blue-100 border border-blue-400 text-blue-900 font-bold rounded text-sm">
          রাউন্ড: {toBn(roundsPlayed)} / {toBn(totalRounds)}
        </span>
      </div>

      {winners.length > 0 && (
        <div className="mb-5 p-4 bg-amber-100/90 border-2 border-dashed border-amber-600 rounded-lg text-center">
          <div className="text-lg font-black text-amber-950 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-amber-600" aria-hidden />
            {winners.length > 1 ? 'যৌথ চ্যাম্পিয়ন!' : 'অভিনন্দন চ্যাম্পিয়ন!'}
          </div>
          <div className="text-sm text-amber-900 mt-1">
            সর্বোচ্চ {toBn(winners[0].totalScore)} পয়েন্ট পেয়ে বিজয়ী{' '}
            <strong>{winners.map((w) => `${w.avatarEmoji} ${w.name}`).join(' ও ')}</strong>!
          </div>
        </div>
      )}

      <ScoreTable players={ranked} roundsToShow={roundsPlayed} />

      <div className="mt-6 pt-4 border-t border-red-300 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            sound.playPaperRustle();
            onResetMatch();
          }}
          className="px-4 py-2 bg-amber-200 hover:bg-amber-300 border border-amber-400 text-amber-950 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-4 h-4" aria-hidden />
          লবিতে ফিরুন
        </button>
        {onPlayAgain && (
          <button
            type="button"
            onClick={onPlayAgain}
            autoFocus
            className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-md"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden />
            {playAgainLabel}
          </button>
        )}
      </div>
    </div>
  );
};
