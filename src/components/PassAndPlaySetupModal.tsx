import React, { useState } from 'react';
import { X, Users, Play, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface PassAndPlaySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPassAndPlay: (names: string[], rounds: number) => void;
  initialNames?: string[];
}

const DEFAULT_EMOJIS = ['🧑‍🎓', '👦', '👧', '🧔'];

export const PassAndPlaySetupModal: React.FC<PassAndPlaySetupModalProps> = ({
  isOpen,
  onClose,
  onStartPassAndPlay,
  initialNames = ['মাহদী', 'তানভীর', 'সাকিব', 'রাকিব'],
}) => {
  const [names, setNames] = useState<string[]>(initialNames);
  const [rounds, setRounds] = useState(5);

  if (!isOpen) return null;

  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  const handleStart = () => {
    sound.playChitDrop();
    const finalNames = names.map((n, i) => n.trim() || `খেলোয়াড় ${i + 1}`);
    onStartPassAndPlay(finalNames, rounds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-md notebook-ruled-page p-6 sm:p-7 rounded-2xl shadow-2xl border-2 border-emerald-600 text-slate-900 font-serif animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-blue-400 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-700" />
            <div>
              <h3 className="text-xl font-bold ink-blue-text font-bangla-hand">
                পাস অ্যান্ড প্লে (৪ বন্ধু এক ডিভাইসে) 📱
              </h3>
              <div className="text-[11px] text-slate-600 font-mono">
                একই কাঠের বেঞ্চে চার কোণায় চারজন
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Player Names Inputs */}
        <div className="space-y-3 mb-5">
          <div className="text-xs font-bold text-blue-950 font-bangla-hand">
            চার বন্ধুর নাম লিখুন (৪টি আসন):
          </div>

          {[0, 1, 2, 3].map((idx) => {
            const sideLabels = ['নিচে (দক্ষিণ)', 'বামে (পশ্চিম)', 'উপরে (উত্তর)', 'ডানে (পূর্ব)'];

            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-white/80 border border-blue-300 rounded-xl shadow-sm"
              >
                <span className="text-xl shrink-0">{DEFAULT_EMOJIS[idx]}</span>
                <div className="flex-1">
                  <div className="text-[10px] text-slate-500 font-mono">
                    আসন {idx + 1} · {sideLabels[idx]}
                  </div>
                  <input
                    type="text"
                    value={names[idx] || ''}
                    onChange={(e) => handleNameChange(idx, e.target.value)}
                    placeholder={`খেলোয়াড় ${idx + 1}`}
                    maxLength={16}
                    className="w-full bg-transparent font-bangla-hand font-bold text-sm text-blue-950 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Rounds Selector */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-blue-950 font-bangla-hand mb-1.5">
            ম্যাচ কত রাউন্ডের হবে?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[3, 5, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRounds(r)}
                className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                  rounds === r
                    ? 'border-emerald-600 bg-emerald-700 text-white shadow'
                    : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {r} রাউন্ড
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>বেঞ্চে চিরকুট ওড়ান (Start Match)</span>
        </button>
      </div>
    </div>
  );
};
