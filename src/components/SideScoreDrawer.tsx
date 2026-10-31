import React, { useEffect, useRef } from 'react';
import { PaperPlayer } from '../types/game';
import { X, FileText } from 'lucide-react';
import { sound } from '../utils/audio';
import { toBn } from '../utils/constants';
import { ScoreTable } from './NotebookScoreboard';

interface SideScoreDrawerProps {
  onClose: () => void;
  players: PaperPlayer[];
  currentRound: number;
  totalRounds: number;
}

export const SideScoreDrawer: React.FC<SideScoreDrawerProps> = ({ onClose, players, currentRound, totalRounds }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => {
    sound.playPaperRustle();
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex justify-end anim-fade">
      <div className="flex-1" onClick={close} aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="পয়েন্ট খাতা"
        tabIndex={-1}
        className="w-full max-w-lg h-full notebook-ruled-page p-5 sm:p-8 border-l-4 border-amber-800 flex flex-col text-slate-900 overflow-y-auto focus:outline-none anim-slide-left"
      >
        <div className="flex items-center justify-between pb-3 border-b-2 border-red-400 mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" aria-hidden />
            <div>
              <h3 className="text-xl font-bold ink-blue-text">পয়েন্ট খাতা 📓</h3>
              <div className="text-slate-600 text-xs">
                রাউন্ড: {toBn(currentRound)} / {toBn(totalRounds)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="খাতা বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs leading-relaxed text-blue-950 grid grid-cols-2 gap-1.5">
          <div>👑 <strong>বাবু</strong>: ১০০০ (নিশ্চিত)</div>
          <div>👮 <strong>পুলিশ</strong>: ৫০০ / ০</div>
          <div>🗡️ <strong>ডাকাত</strong>: ৪০০ / ০</div>
          <div>🥷 <strong>চোর</strong>: ১০০ / ০</div>
        </div>

        <ScoreTable
          players={players}
          roundsToShow={Math.max(currentRound, ...players.map((p) => p.scoreHistory.length))}
          highlightLatest
        />

        <div className="mt-auto pt-4 border-t border-red-300 flex items-center justify-between gap-2 text-xs text-slate-600">
          <span>* সর্বোচ্চ পয়েন্টধারী বিজয়ী হবে।</span>
          <button
            type="button"
            onClick={close}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition-colors text-sm"
          >
            খাতা বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
