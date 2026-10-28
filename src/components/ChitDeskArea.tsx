import React from 'react';
import { PaperPlayer } from '../types/game';
import { PaperChit } from './PaperChit';
import { sound } from '../utils/audio';
import { Sparkles, Crown, ArrowRight } from 'lucide-react';

interface ChitDeskAreaProps {
  players: PaperPlayer[];
  humanPlayerId: string;
  hasHumanOpenedChit: boolean;
  onOpenHumanChit: () => void;
  onRajaDeclare: () => void;
  currentRound: number;
}

export const ChitDeskArea: React.FC<ChitDeskAreaProps> = ({
  players,
  humanPlayerId,
  hasHumanOpenedChit,
  onOpenHumanChit,
  onRajaDeclare,
  currentRound,
}) => {
  const humanPlayer = players.find((p) => p.id === humanPlayerId)!;
  const rajaPlayer = players.find((p) => p.role === 'raja')!;
  const isHumanRaja = humanPlayer.role === 'raja';

  // Rotations for the 4 chits on wooden desk
  const rotations = [-8, 12, -5, 10];

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* Wooden Desk Top Status */}
      <div className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-950/80 border border-amber-800/80 rounded-xl mb-6 text-xs text-amber-200 font-serif">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>স্কুলের কাঠের বেঞ্চে ৪টি চিরকুট ছিটকে পড়েছে!</span>
        </div>
        <div className="font-mono text-amber-400 font-bold">
          রাউন্ড {currentRound}
        </div>
      </div>

      {/* The 4 Chits on Desk */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 justify-items-center my-4 p-6 rounded-2xl bg-black/30 border border-amber-900/40 shadow-inner">
        {players.map((player, idx) => {
          const isHuman = player.id === humanPlayerId;
          const isOpened = isHuman ? hasHumanOpenedChit : false;

          return (
            <div key={player.id} className="flex flex-col items-center gap-2">
              <PaperChit
                role={player.role}
                isOpened={isOpened}
                onOpen={isHuman ? onOpenHumanChit : undefined}
                playerName={player.name}
                isPlayerChit={isHuman}
                rotation={rotations[idx % 4]}
                disabled={!isHuman}
              />

              <div className="text-[11px] font-bold text-amber-300 font-serif flex items-center gap-1">
                <span>{player.avatarEmoji}</span>
                <span>{player.name}</span>
                {isHuman && (
                  <span className="text-[10px] text-blue-400 font-mono">(আপনি)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Prompts Below Desk */}
      <div className="w-full mt-4 text-center">
        {!hasHumanOpenedChit ? (
          <div className="p-4 bg-amber-900/40 border border-amber-700/50 rounded-xl max-w-md mx-auto text-amber-100 font-serif text-sm">
            👇 আপনার চিরকুটটিতে ট্যাপ করে ভাঁজ খুলুন এবং নিজের গোপন ভূমিকা দেখুন!
          </div>
        ) : (
          <div className="p-5 bg-amber-950/90 border-2 border-amber-600 rounded-2xl max-w-lg mx-auto shadow-xl flex flex-col items-center">
            {isHumanRaja ? (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2 animate-bounce">
                  <Crown className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-black text-amber-300 font-serif mb-1">
                  আপনি মহারাজ! (১০০০ পয়েন্ট) 👑
                </h4>
                <p className="text-xs text-amber-200/90 font-serif mb-4">
                  চিরকুট পেয়েই রাজাকে ঘোষণা করতে হবে। নিচে চাপ দিয়ে দারোগা বাবুকে তলব করুন!
                </p>
                <button
                  onClick={() => {
                    sound.playRajaTrumpet();
                    onRajaDeclare();
                  }}
                  className="py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm font-serif shadow-lg hover:shadow-amber-500/20 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  <Crown className="w-5 h-5 fill-current" />
                  <span>"আমি রাজা! কে আমার পুলিশ?" 📢</span>
                </button>
              </>
            ) : (
              <>
                <div className="text-xs font-serif text-amber-300 mb-2">
                  মহারাজা মশাইয়ের ঘোষণা শোনার অপেক্ষা...
                </div>
                <div className="p-3 bg-amber-900/50 rounded-lg text-xs font-serif text-amber-100 flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    মহারাজা হলেন <strong>{rajaPlayer.name}</strong>! তিনি সিংহাসনে বসেছেন।
                  </span>
                </div>
                <button
                  onClick={() => {
                    sound.playRajaTrumpet();
                    onRajaDeclare();
                  }}
                  className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs font-serif transition-colors flex items-center gap-2 shadow"
                >
                  <span>রাজার তলব ও পুলিশের প্রবেশ দেখুন</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
