import React, { useState } from 'react';
import { User, Check, Users, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';
import { Modal } from './Modal';

interface PlayerProfileModalProps {
  onClose: () => void;
  currentName: string;
  currentEmoji: string;
  nameX: string;
  nameY: string;
  nameZ: string;
  onSaveProfile: (yourName: string, yourEmoji: string, nameX: string, nameY: string, nameZ: string) => void;
}

const AVATAR_OPTIONS = ['🧑‍🎓', '👦', '👧', '🧔', '🤠', '🕵️‍♂️', '🥷', '👮‍♂️'];
const OTHER_SEATS = ['খেলোয়াড় ২ (বামে)', 'খেলোয়াড় ৩ (উপরে)', 'খেলোয়াড় ৪ (ডানে)'];
const DEFAULT_OTHERS = ['X', 'Y', 'Z'];

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  onClose,
  currentName,
  currentEmoji,
  nameX,
  nameY,
  nameZ,
  onSaveProfile,
}) => {
  const [yourName, setYourName] = useState(currentName);
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);
  const [others, setOthers] = useState([nameX, nameY, nameZ]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yourName.trim()) return;
    sound.playPenScratch();
    const [x, y, z] = others.map((n, i) => n.trim() || DEFAULT_OTHERS[i]);
    onSaveProfile(yourName.trim(), selectedEmoji, x, y, z);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      className="max-w-md border-amber-400"
      icon={<User className="w-5 h-5 text-blue-700 shrink-0" />}
      title="প্রোফাইল ও নাম ✍️"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-bold text-blue-950 mb-1.5">আপনার প্রতিকৃতি:</legend>
          <div className="grid grid-cols-4 gap-2" role="radiogroup">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                role="radio"
                aria-checked={selectedEmoji === emoji}
                onClick={() => {
                  sound.playPaperRustle();
                  setSelectedEmoji(emoji);
                }}
                className={`p-2 rounded-xl text-2xl transition-all border ${
                  selectedEmoji === emoji ? 'border-blue-600 bg-blue-100 shadow-md scale-105' : 'border-blue-200 bg-white/70 hover:bg-blue-50'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block p-3 bg-white/90 border border-blue-300 rounded-xl">
          <span className="block text-sm font-bold text-blue-950 mb-1">আপনার নাম:</span>
          <input
            type="text"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="যেমন: মাহদী"
            maxLength={20}
            required
            className="w-full py-2 px-3 bg-white border border-blue-300 rounded-lg text-slate-900 font-bold text-base focus:outline-none focus:border-blue-600"
          />
          <span className="block text-[11px] text-slate-500 mt-1">অনলাইন রুমেও এই নাম দেখা যাবে।</span>
        </label>

        <fieldset aria-label="বটদের নাম" className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-950">
              <Users className="w-4 h-4 text-amber-800" aria-hidden />
              বটদের নাম
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOthers(DEFAULT_OTHERS)}
                className="px-2 py-0.5 text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 rounded border border-amber-400 flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" aria-hidden />
                X, Y, Z
              </button>
              <button
                type="button"
                onClick={() => setOthers(['রহিম', 'করিম', 'ফাতেমা'])}
                className="px-2 py-0.5 text-[11px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 rounded border border-amber-400"
              >
                বাংলা নাম
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OTHER_SEATS.map((label, i) => (
              <label key={label} className="block">
                <span className="block text-[11px] font-bold text-slate-600 mb-0.5">{label}</span>
                <input
                  type="text"
                  value={others[i]}
                  onChange={(e) => setOthers((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                  placeholder={DEFAULT_OTHERS[i]}
                  maxLength={15}
                  className="w-full py-1.5 px-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-bold text-sm focus:outline-none focus:border-blue-600"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!yourName.trim()}
          className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-base shadow-md transition-colors flex items-center justify-center gap-1.5"
        >
          <Check className="w-4 h-4" aria-hidden />
          সংরক্ষণ করুন
        </button>
      </form>
    </Modal>
  );
};
