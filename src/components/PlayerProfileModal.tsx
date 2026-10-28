import React, { useState } from 'react';
import { X, User, Check, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentEmoji: string;
  onSaveProfile: (name: string, emoji: string) => void;
}

const AVATAR_OPTIONS = ['🧑‍🎓', '👦', '👧', '🧔', '🤠', '🕵️‍♂️', '🥷', '👮‍♂️'];

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  currentName,
  currentEmoji,
  onSaveProfile,
}) => {
  const [name, setName] = useState(currentName);
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);

  if (!isOpen) return null;

  const handleSave = () => {
    if (name.trim()) {
      sound.playPenScratch();
      onSaveProfile(name.trim(), selectedEmoji);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm notebook-ruled-page p-6 sm:p-7 rounded-2xl shadow-2xl border-2 border-amber-400 text-slate-900 font-serif animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-blue-400 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-700" />
            <h3 className="text-lg font-bold ink-blue-text font-serif">
              খেলোয়াড়ের নাম ও প্রোফাইল ✍️
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          {/* Avatar Emoji Grid */}
          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1.5">
              কার্ডে আপনার প্রতিকৃতি (Avatar):
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    setSelectedEmoji(emoji);
                  }}
                  className={`p-2 rounded-xl text-2xl transition-all border ${
                    selectedEmoji === emoji
                      ? 'border-blue-600 bg-blue-100 shadow-md scale-105'
                      : 'border-blue-200 bg-white/70 hover:bg-blue-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold text-blue-950 mb-1">
              আপনার নাম লিখুন (Player Name):
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: মাহদী, তানভীর, রাহুল..."
              maxLength={20}
              className="w-full py-2.5 px-3 bg-white border-2 border-blue-300 rounded-xl text-slate-900 font-serif font-bold text-sm focus:outline-none focus:border-blue-600 shadow-inner"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * এই নামটি বেঞ্চের চিরকুট ও খাতার হিসেবের পাতায় লেখা হবে।
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 pt-3 border-t border-red-300 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>সংরক্ষণ করুন (Save Name)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
