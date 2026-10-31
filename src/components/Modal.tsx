import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// Notebook-page dialog: closes on Escape or backdrop click and traps initial focus.
export const Modal: React.FC<ModalProps> = ({ onClose, title, icon, subtitle, className = '', children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto anim-fade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative w-full my-auto notebook-ruled-page p-5 sm:p-7 rounded-2xl border-2 text-slate-900 focus:outline-none anim-pop ${className}`}
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b-2 border-blue-400 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-bold ink-blue-text leading-snug">{title}</h3>
              {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
