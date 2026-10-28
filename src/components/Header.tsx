import React from 'react';
import { Volume2, VolumeX, BookOpen, Settings as SettingsIcon, Languages } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { sound } from '../utils/audio';

interface HeaderProps {
  language: Language;
  onToggleLanguage: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onToggleLanguage,
  onOpenRules,
  onOpenSettings,
  isMuted,
  onToggleMute,
}) => {
  const t = translations[language];

  return (
    <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-4 border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
          {t.appTitle}
        </h1>
      </div>

      {/* Zone 2: Clean single-line text links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={onOpenRules}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <BookOpen className="w-4 h-4" />
          <span>{t.rules}</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <SettingsIcon className="w-4 h-4" />
          <span>{t.settings}</span>
        </button>
      </nav>

      {/* Zone 3: Primary action & quick controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Language switch */}
        <button
          onClick={onToggleLanguage}
          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 whitespace-nowrap"
          title="Toggle Language / ভাষা পরিবর্তন"
        >
          <Languages className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>

        {/* Sound toggle */}
        <button
          onClick={onToggleMute}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Mobile menu buttons */}
        <button
          onClick={onOpenRules}
          className="md:hidden p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
          title={t.rules}
        >
          <BookOpen className="w-4 h-4" />
        </button>
        <button
          onClick={onOpenSettings}
          className="md:hidden p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white"
          title={t.settings}
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
