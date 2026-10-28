import React, { useState } from 'react';
import { Player } from '../types/game';
import { roleAssets, Language, translations } from '../utils/i18n';
import { Eye, EyeOff, ShieldAlert, ArrowRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface PrivateRevealModalProps {
  player: Player;
  currentPlayerIndex: number;
  totalPlayers: number;
  onConfirmSeen: () => void;
  language: Language;
  isBotGame: boolean;
}

export const PrivateRevealModal: React.FC<PrivateRevealModalProps> = ({
  player,
  currentPlayerIndex,
  totalPlayers,
  onConfirmSeen,
  language,
  isBotGame,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const t = translations[language];
  const roleMeta = roleAssets[player.role as keyof typeof roleAssets];

  const handleReveal = () => {
    sound.playCardFlip();
    setIsRevealed(true);
  };

  const handleDone = () => {
    setIsRevealed(false);
    onConfirmSeen();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="text-xs text-slate-400 font-mono mb-2">
          {language === 'bn' ? 'গোপন ভূমিকা পরীক্ষা' : 'Private Inspection'} ·{' '}
          <span className="text-amber-400">
            {currentPlayerIndex + 1}/{totalPlayers}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
          {player.displayName}
        </h2>

        {!isRevealed ? (
          <div className="my-6 w-full flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <p className="text-sm text-slate-300 max-w-xs mb-6 leading-relaxed">
              {isBotGame
                ? language === 'bn'
                  ? 'আপনার গোপন কার্ড দেখতে নিচের বোতামে চাপ দিন।'
                  : 'Tap below to reveal your secret identity for this round.'
                : language === 'bn'
                ? `অনুগ্রহ করে ডিভাইসটি ${player.displayName}-কে দিন। অন্য কেউ যেন স্ক্রিন না দেখে!`
                : `Pass the device to ${player.displayName}. Make sure no other player can peek!`}
            </p>

            <button
              onClick={handleReveal}
              className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              <span>{t.tapToReveal}</span>
            </button>
          </div>
        ) : (
          <div className="my-4 w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="relative w-44 aspect-square rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-2xl mb-4">
              <img
                src={roleMeta.image}
                alt={player.role}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 text-center">
                <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
                  {language === 'bn' ? roleMeta.nameBn : roleMeta.nameEn}
                </span>
              </div>
            </div>

            <div className="text-2xl font-black text-white mb-1">
              {language === 'bn' ? roleMeta.nameBn : roleMeta.nameEn}
            </div>
            <div className="text-xs text-amber-400 font-medium mb-3">
              {language === 'bn' ? roleMeta.titleBn : roleMeta.titleEn}
            </div>

            <p className="text-xs text-slate-300 max-w-xs mb-6 leading-relaxed px-4 py-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
              {language === 'bn' ? roleMeta.descBn : roleMeta.descEn}
            </p>

            <button
              onClick={handleDone}
              className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span>
                {isBotGame
                  ? t.understood
                  : currentPlayerIndex + 1 < totalPlayers
                  ? t.tapToHide
                  : t.understood}
              </span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
