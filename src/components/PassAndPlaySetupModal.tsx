import React, { useState } from 'react';
import { Users, Play } from 'lucide-react';
import { ROUND_OPTIONS, toBn } from '../utils/constants';
import { Modal } from './Modal';

interface PassAndPlaySetupModalProps {
  onClose: () => void;
  onStartPassAndPlay: (names: string[], rounds: number) => void;
  initialNames: string[];
  initialRounds: number;
}

const DEFAULT_EMOJIS = ['🧑‍🎓', '👦', '👧', '🧔'];
const SIDE_LABELS = ['নিচে (দক্ষিণ)', 'বামে (পশ্চিম)', 'উপরে (উত্তর)', 'ডানে (পূর্ব)'];

export const PassAndPlaySetupModal: React.FC<PassAndPlaySetupModalProps> = ({
  onClose,
  onStartPassAndPlay,
  initialNames,
  initialRounds,
}) => {
  const [names, setNames] = useState<string[]>(initialNames);
  const [rounds, setRounds] = useState(ROUND_OPTIONS.includes(initialRounds) ? initialRounds : 5);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNames = names.map((n, i) => n.trim() || `খেলোয়াড় ${toBn(i + 1)}`);
    onClose();
    onStartPassAndPlay(finalNames, rounds);
  };

  return (
    <Modal
      onClose={onClose}
      className="max-w-md border-emerald-600"
      icon={<Users className="w-6 h-6 text-emerald-700 shrink-0" />}
      title="পাস অ্যান্ড প্লে 📱"
      subtitle="একই ডিভাইসে, বেঞ্চের চার কোণায় চারজন"
    >
      <form onSubmit={handleStart}>
        <fieldset className="space-y-2.5 mb-5">
          <legend className="text-sm font-bold text-blue-950 mb-2">চার বন্ধুর নাম লিখুন:</legend>
          {SIDE_LABELS.map((side, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2 p-2 bg-white/80 border border-blue-300 rounded-xl focus-within:border-blue-600"
            >
              <span className="text-xl shrink-0" aria-hidden>
                {DEFAULT_EMOJIS[idx]}
              </span>
              <span className="flex-1">
                <span className="block text-[11px] text-slate-500">
                  আসন {toBn(idx + 1)} · {side}
                </span>
                <input
                  type="text"
                  value={names[idx] || ''}
                  onChange={(e) => setNames((prev) => prev.map((n, i) => (i === idx ? e.target.value : n)))}
                  placeholder={`খেলোয়াড় ${toBn(idx + 1)}`}
                  maxLength={16}
                  className="w-full bg-transparent font-bangla-hand font-bold text-base text-blue-950 focus:outline-none"
                />
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="mb-5">
          <legend className="text-sm font-bold text-blue-950 mb-1.5">ম্যাচ কত রাউন্ডের হবে?</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROUND_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={rounds === r}
                onClick={() => setRounds(r)}
                className={`py-2 rounded-xl text-sm font-bold transition-all border ${
                  rounds === r ? 'border-emerald-600 bg-emerald-700 text-white shadow' : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-50'
                }`}
              >
                {toBn(r)} রাউন্ড
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden />
          বেঞ্চে চিরকুট ছড়ান — খেলা শুরু
        </button>
      </form>
    </Modal>
  );
};
