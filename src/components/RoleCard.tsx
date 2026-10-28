import React from 'react';
import { Player, PlayerRole, TargetRole } from '../types/game';
import { roleAssets, Language } from '../utils/i18n';
import { HelpCircle } from 'lucide-react';

interface RoleCardProps {
  player: Player;
  isRevealed: boolean;
  isEligibleSuspect?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  targetRole?: TargetRole;
  isRoundResult?: boolean;
  wasGuessed?: boolean;
  language: Language;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  player,
  isRevealed,
  isEligibleSuspect = false,
  isSelected = false,
  onSelect,
  targetRole,
  isRoundResult = false,
  wasGuessed = false,
  language,
}) => {
  const roleMeta = roleAssets[player.role as keyof typeof roleAssets];
  const roleName = language === 'bn' ? roleMeta.nameBn : roleMeta.nameEn;
  const roleTitle = language === 'bn' ? roleMeta.titleBn : roleMeta.titleEn;

  const isTargetCriminal = isRoundResult && targetRole && player.role === targetRole;

  return (
    <div
      onClick={isEligibleSuspect ? onSelect : undefined}
      className={`relative group flex flex-col rounded-xl overflow-hidden transition-all duration-300 ${
        isEligibleSuspect
          ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10'
          : ''
      } ${
        isSelected
          ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-500/20'
          : 'border border-slate-800 bg-slate-900/90'
      }`}
    >
      {/* Top Player Info Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: player.avatarColor }}
          />
          <span className="font-semibold text-slate-200 truncate">
            {player.displayName}
          </span>
          {player.isBot && (
            <span className="text-[10px] text-slate-400 font-mono">
              [BOT]
            </span>
          )}
        </div>

        {/* Taka Balance */}
        <div className="flex items-center gap-1 font-mono font-bold text-amber-400 shrink-0">
          <span>৳</span>
          <span className="tabular-nums text-sm">{player.balance}</span>
        </div>
      </div>

      {/* Card Body / Visual Asset */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {isRevealed ? (
          <>
            <img
              src={roleMeta.image}
              alt={roleName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
              <div>
                <div className="text-base font-extrabold text-white tracking-wide drop-shadow-md">
                  {roleName}
                </div>
                <div className="text-[11px] text-slate-300 font-medium">
                  {roleTitle}
                </div>
              </div>

              {isRoundResult && (
                <div>
                  {isTargetCriminal ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/90 text-white shadow">
                      {language === 'bn' ? 'আসল লক্ষ্য' : 'Target'}
                    </span>
                  ) : wasGuessed ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/90 text-slate-950 shadow">
                      {language === 'bn' ? 'অভিযুক্ত' : 'Accused'}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-radial from-slate-800 to-slate-950 border-2 border-dashed border-slate-700/60 m-2 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2 text-slate-400">
              <HelpCircle className="w-6 h-6 text-amber-400/80" />
            </div>
            <div className="text-xs font-semibold text-slate-300">
              {language === 'bn' ? 'গোপন ভূমিকা' : 'Secret Identity'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {language === 'bn' ? 'সন্দেহভাজন অপরাধী' : 'Hidden Suspect'}
            </div>

            {isEligibleSuspect && (
              <div className="mt-3 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-[11px] text-amber-300 font-medium animate-pulse">
                {language === 'bn' ? 'তদন্তের জন্য ক্লিক করুন' : 'Click to Interrogate'}
              </div>
            )}
          </div>
        )}
      </div>

      {isEligibleSuspect && (
        <div className="p-2.5 bg-slate-900/95 border-t border-slate-800 flex justify-center">
          <button
            type="button"
            className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              isSelected
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isSelected
              ? language === 'bn'
                ? 'নির্বাচিত সন্দেহভাজন'
                : 'Selected Suspect'
              : language === 'bn'
              ? 'সন্দেহভাজন চিহ্নিত করুন'
              : 'Target Suspect'}
          </button>
        </div>
      )}
    </div>
  );
};
