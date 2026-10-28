import React from 'react';
import { RoleType } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/constants';
import { sound } from '../utils/audio';

interface PaperChitProps {
  role: RoleType;
  isOpened: boolean;
  onOpen?: () => void;
  playerName: string;
  isPlayerChit?: boolean;
  rotation?: number;
  disabled?: boolean;
}

export const PaperChit: React.FC<PaperChitProps> = ({
  role,
  isOpened,
  onOpen,
  playerName,
  isPlayerChit = false,
  rotation = 0,
  disabled = false,
}) => {
  const roleDef = ROLE_DEFINITIONS[role];

  const handleClick = () => {
    if (!isOpened && onOpen && !disabled) {
      sound.playPaperRustle();
      onOpen();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`relative select-none transition-all duration-300 ${
        !isOpened && !disabled ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      }`}
    >
      {!isOpened ? (
        /* Folded Paper Chit (মোড়ানো চিরকুট) */
        <div className="w-36 sm:w-44 h-24 sm:h-28 paper-chit-crease rounded-sm flex flex-col items-center justify-center p-3 relative overflow-hidden group">
          {/* Subtle fold creases and staple/crease lines */}
          <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-amber-900/15 shadow-sm" />
          <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-amber-900/15 shadow-sm" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-amber-900/15 shadow-sm" />

          {/* Notebook line peeking through fold */}
          <div className="text-[10px] text-blue-900/40 font-mono tracking-widest uppercase mb-1">
            [ভাঁজ করা চিরকুট]
          </div>

          <div className="text-xs sm:text-sm font-bold text-amber-950 font-serif">
            {playerName}
          </div>

          {!disabled && (
            <div className="mt-1 text-[10px] text-blue-700 font-semibold px-2 py-0.5 bg-blue-100/60 rounded-full animate-pulse">
              খুলতে ট্যাপ করুন ✍️
            </div>
          )}

          {isPlayerChit && (
            <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-600 shadow" title="আপনার চিরকুট" />
          )}
        </div>
      ) : (
        /* Unfolded Torn Notebook Chit (খোলা চিরকুট) */
        <div className="w-40 sm:w-48 h-36 sm:h-44 notebook-ruled-page border border-amber-300/80 rounded-sm shadow-xl p-3 flex flex-col justify-between animate-in zoom-in-95 duration-200 relative overflow-hidden">
          {/* Paper texture overlay */}
          <div className="absolute -top-1 left-3 right-3 h-2 bg-red-400/30 rounded-full blur-[1px]" />

          {/* Header */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-b border-blue-200 pb-1">
            <span className="text-red-700/80 font-bold">{playerName}</span>
            <span className="text-blue-900/60 text-[10px]">খাতার চিরকুট</span>
          </div>

          {/* Main Handwritten Role & Points in Blue Ballpoint Ink */}
          <div className="my-auto text-center">
            <div className="text-3xl sm:text-4xl font-extrabold ink-blue-text font-serif tracking-tight drop-shadow-sm">
              {roleDef.nameBn}
            </div>

            <div className="mt-1.5 inline-block px-3 py-0.5 border-2 border-blue-700 rounded-full text-blue-800 font-bold text-sm sm:text-base font-mono pen-stamp-circle bg-blue-50/50">
              পয়েন্ট: {roleDef.points}
            </div>
          </div>

          {/* Role Tagline */}
          <div className="text-[11px] text-blue-900/80 italic text-center font-serif leading-tight">
            "{roleDef.quoteBn}"
          </div>
        </div>
      )}
    </div>
  );
};
