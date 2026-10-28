import React, { useState } from 'react';
import { X, User, Check, Users, RotateCcw, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentEmoji: string;
  nameX: string;
  nameY: string;
  nameZ: string;
  onSaveProfile: (
    yourName: string,
    yourEmoji: string,
    nameX: string,
    nameY: string,
    nameZ: string
  ) => void;
}

const AVATAR_OPTIONS = ['🧑‍🎓', '👦', '👧', '🧔', '🤠', '🕵️‍♂️', '🥷', '👮‍♂️'];

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
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
  const [otherX, setOtherX] = useState(nameX);
  const [otherY, setOtherY] = useState(nameY);
  const [otherZ, setOtherZ] = useState(nameZ);

  if (!isOpen) return null;

  const handleSave = () => {
    if (yourName.trim()) {
      sound.playPenScratch();
      onSaveProfile(
        yourName.trim(),
        selectedEmoji,
        otherX.trim() || 'X',
        otherY.trim() || 'Y',
        otherZ.trim() || 'Z'
      );
      onClose();
    }
  };

  const handleResetToXYZ = () => {
    sound.playPaperRustle();
    setOtherX('X');
    setOtherY('Y');
    setOtherZ('Z');
  };

  const handleSetTraditionalNames = () => {
    sound.playPaperRustle();
    setOtherX('রহিম');
    setOtherY('করিম');
    setOtherZ('ফাতেমা');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md notebook-ruled-page p-5 sm:p-6 rounded-2xl shadow-2xl border-2 border-amber-400 text-slate-900 font-serif animate-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-blue-400 mb-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-700" />
            <h3 className="text-lg font-bold ink-blue-text font-serif">
              খেলোয়াড়দের নাম পরিবর্তন ও প্রোফাইল ✍️
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
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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

          {/* User Name Input */}
          <div className="p-3 bg-white/90 border border-blue-300 rounded-xl shadow-sm">
            <label className="block text-xs font-bold text-blue-950 mb-1">
              আপনার নাম (Player 1 - You):
            </label>
            <input
              type="text"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              placeholder="যেমন: আপনি, মাহদী..."
              maxLength={20}
              className="w-full py-2 px-3 bg-white border border-blue-300 rounded-lg text-slate-900 font-serif font-bold text-sm focus:outline-none focus:border-blue-600 shadow-inner"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * আপনার আসনটি কাঠের বেঞ্চের নিচে (দক্ষিণে)।
            </p>
          </div>

          {/* Other 3 Player Names (X, Y, Z) */}
          <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-xl shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <Users className="w-4 h-4 text-amber-800" />
                <span>বাকি ৩ খেলোয়াড়ের নাম (Default: X, Y, Z):</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetToXYZ}
                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 hover:bg-amber-300 text-amber-950 rounded border border-amber-400 transition-colors flex items-center gap-0.5"
                  title="X, Y, Z নাম সেট করুন"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>X, Y, Z</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  খেলোয়াড় ২ (বামে):
                </label>
                <input
                  type="text"
                  value={otherX}
                  onChange={(e) => setOtherX(e.target.value)}
                  placeholder="X"
                  maxLength={15}
                  className="w-full py-1.5 px-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-serif font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  খেলোয়াড় ৩ (উপরে):
                </label>
                <input
                  type="text"
                  value={otherY}
                  onChange={(e) => setOtherY(e.target.value)}
                  placeholder="Y"
                  maxLength={15}
                  className="w-full py-1.5 px-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-serif font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  খেলোয়াড় ৪ (ডানে):
                </label>
                <input
                  type="text"
                  value={otherZ}
                  onChange={(e) => setOtherZ(e.target.value)}
                  placeholder="Z"
                  maxLength={15}
                  className="w-full py-1.5 px-2 bg-white border border-blue-300 rounded-lg text-slate-900 font-serif font-bold text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
              <span>* এই নামগুলো টেবিলের চিরকুট ও খাতার টেবিলে প্রদর্শিত হবে।</span>
              <button
                type="button"
                onClick={handleSetTraditionalNames}
                className="text-blue-700 underline hover:text-blue-900"
              >
                বাংলা নাম
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-5 pt-3 border-t border-red-300 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!yourName.trim()}
            className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>সব নাম সংরক্ষণ করুন (Save Names)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
