import React, { useState, useEffect } from 'react';
import { PaperPlayer, RoleType } from '../types/game';
import { ROLE_DEFINITIONS } from '../utils/constants';
import { sound } from '../utils/audio';
import { Crown, Shield, Search, Sparkles, MessageCircle, AlertTriangle } from 'lucide-react';

interface DeductionAreaProps {
  players: PaperPlayer[];
  humanPlayerId: string;
  onAccuseSuspect: (suspectPlayerId: string) => void;
  isBotPoliceThinking: boolean;
  botPoliceThoughtText: string | null;
}

export const DeductionArea: React.FC<DeductionAreaProps> = ({
  players,
  humanPlayerId,
  onAccuseSuspect,
  isBotPoliceThinking,
  botPoliceThoughtText,
}) => {
  const raja = players.find((p) => p.role === 'raja')!;
  const police = players.find((p) => p.role === 'police')!;
  const suspects = players.filter((p) => p.role !== 'raja' && p.role !== 'police');

  const isHumanPolice = police.id === humanPlayerId;
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Top Banner: Raja & Police Dialogue */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {/* Raja's Royal Decree */}
        <div className="p-3.5 bg-amber-950/80 border-2 border-amber-600/60 rounded-xl text-amber-200 shadow-lg flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <span>{raja.name} (মহারাজা · ১০০০ পয়েন্ট)</span>
            </div>
            <p className="text-xs sm:text-sm font-serif italic text-amber-100 mt-0.5">
              "আমি রাজা! কে আমার পুলিশ? এখনই আসামীকে হাজির করো!"
            </p>
          </div>
        </div>

        {/* Police's Salute & Mission */}
        <div className="p-3.5 bg-blue-950/80 border-2 border-blue-600/60 rounded-xl text-blue-200 shadow-lg flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-300 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-300 flex items-center gap-1">
              <span>{police.name} (দারোগা · ৫০০ পয়েন্ট)</span>
            </div>
            <p className="text-xs sm:text-sm font-serif italic text-blue-100 mt-0.5">
              "হুজুর, আমি আপনার দারোগা! চোখের পলকে চোর সনাক্ত করছি!"
            </p>
          </div>
        </div>
      </div>

      {/* Deduction Instructions */}
      <div className="w-full p-3 bg-amber-900/40 border border-amber-700/50 rounded-xl text-center text-amber-200 mb-6">
        {isHumanPolice ? (
          <div>
            <div className="text-sm font-bold text-amber-300 flex items-center justify-center gap-1.5">
              <Search className="w-4 h-4" />
              <span>আপনি পুলিশ! নিচের সন্দেহভাজনদের দেখে চোর চিহ্নিত করুন</span>
            </div>
            <div className="text-xs text-amber-400/80 mt-0.5">
              সঠিক চোর ধরতে পারলে পাবেন ৫০০ পয়েন্ট, ভুল হলে ০ পয়েন্ট এবং চোর আপনার পয়েন্ট চুরি করবে!
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-blue-300 animate-pulse">
            <Search className="w-4 h-4" />
            <span>
              {botPoliceThoughtText ||
                `${police.name} (দারোগা) সন্দেহভাজনদের মুখের ভাব ও আচরণ লক্ষ্য করছেন...`}
            </span>
          </div>
        )}
      </div>

      {/* The Suspects Grid (চোর ও বাবুর মনস্তাত্ত্বিক লড়াই) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
        {suspects.map((suspect) => {
          const isSelected = selectedSuspectId === suspect.id;

          return (
            <div
              key={suspect.id}
              onClick={() => isHumanPolice && setSelectedSuspectId(suspect.id)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                isHumanPolice ? 'cursor-pointer hover:-translate-y-1' : ''
              } ${
                isSelected
                  ? 'border-blue-400 bg-blue-950/70 shadow-xl shadow-blue-500/20'
                  : 'border-amber-700/60 bg-amber-950/60 hover:border-amber-500'
              }`}
            >
              <div>
                {/* Suspect Header */}
                <div className="flex items-center justify-between pb-2 border-b border-amber-800/60 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{suspect.avatarEmoji}</span>
                    <span className="font-bold text-white text-sm">{suspect.name}</span>
                    {suspect.isBot && (
                      <span className="text-[10px] text-amber-400/60 font-mono">[বট]</span>
                    )}
                  </div>

                  <span className="text-[11px] font-mono px-2 py-0.5 bg-amber-900/60 border border-amber-700 rounded text-amber-300">
                    সন্দেহভাজন
                  </span>
                </div>

                {/* Bluffing Dialogue & Reaction */}
                <div className="my-4 space-y-2">
                  {/* Dialogue Bubble */}
                  <div className="relative p-3 bg-white text-slate-900 rounded-lg shadow font-serif text-xs leading-relaxed border border-slate-300">
                    <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white rotate-45 border-t border-l border-slate-300" />
                    <div className="flex items-start gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="italic font-medium">"{suspect.currentDialogue}"</span>
                    </div>
                  </div>

                  {/* Body Language / Expression */}
                  <div className="text-[11px] text-amber-300/90 flex items-center gap-1.5 px-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>ভাবভঙ্গি: {suspect.currentReaction}</span>
                  </div>
                </div>
              </div>

              {/* Accuse Action for Human Police */}
              {isHumanPolice && (
                <div className="pt-2 border-t border-amber-800/40">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccuseSuspect(suspect.id);
                    }}
                    className={`w-full py-2.5 px-4 rounded-lg font-bold text-xs font-serif transition-all shadow-md flex items-center justify-center gap-2 ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-amber-950'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>একেই চোর হিসেবে ঘোষণা করুন! ⚖️</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
