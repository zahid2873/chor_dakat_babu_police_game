import React from 'react';
import { X, Settings as SettingsIcon, Sliders, Volume2, Globe } from 'lucide-react';
import { GameConfig } from '../types/game';
import { Language, translations } from '../utils/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GameConfig;
  onChangeConfig: (newConfig: GameConfig) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onChangeConfig,
  isMuted,
  onToggleMute,
  language,
  onSetLanguage,
}) => {
  if (!isOpen) return null;
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">{t.settings}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings options */}
        <div className="py-4 space-y-5 text-xs sm:text-sm">
          {/* Starting Balance */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {t.startingBalance}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 25, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => onChangeConfig({ ...config, startingBalance: amt })}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold font-mono transition-all ${
                    config.startingBalance === amt
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  ৳{amt} {amt === 25 ? (language === 'bn' ? '(স্ট্যান্ডার্ড)' : '(Default)') : ''}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'bn'
                ? 'গোফি বুকলেট নির্দেশিকা অনুসারে প্রতিটি খেলোয়াড় ২৫ টাকা দিয়ে শুরু করেন।'
                : 'Per Goofi official rules, each player starts with ৳25 virtual Taka.'}
            </p>
          </div>

          {/* Target Criminal Order */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              {t.targetOrder}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, targetOrder: 'alternating' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  config.targetOrder === 'alternating'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {t.targetAlternating}
              </button>
              <button
                type="button"
                onClick={() => onChangeConfig({ ...config, targetOrder: 'policeChoice' })}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  config.targetOrder === 'policeChoice'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {language === 'bn' ? 'এলোমেলো / মুক্ত' : 'Randomized'}
              </button>
            </div>
          </div>

          {/* Alternate Retailer Rule (+৳2 to other criminal) */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-200 text-xs">
                {t.alternateRule}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {t.alternateRuleDesc}
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.alternateDistributionEnabled}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  alternateDistributionEnabled: e.target.checked,
                })
              }
              className="mt-1 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
            />
          </div>

          {/* Sound toggle */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-200 text-xs">
                {language === 'bn' ? 'শব্দ ও কয়েন ইফেক্ট' : 'Sound & Coin FX'}
              </span>
            </div>
            <button
              onClick={onToggleMute}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                !isMuted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {!isMuted ? (language === 'bn' ? 'চালু' : 'Enabled') : (language === 'bn' ? 'বন্ধ' : 'Muted')}
            </button>
          </div>

          {/* Language selector */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-200 text-xs">
                {language === 'bn' ? 'ভাষা নির্বাচন' : 'Language'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSetLanguage('en')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                English
              </button>
              <button
                onClick={() => onSetLanguage('bn')}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  language === 'bn'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors"
          >
            {language === 'bn' ? 'সংরক্ষণ ও বন্ধ' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
