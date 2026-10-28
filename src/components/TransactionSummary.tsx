import React from 'react';
import { RoundResult, Transaction } from '../types/game';
import { Language, translations } from '../utils/i18n';
import { ArrowRight, Coins } from 'lucide-react';

interface TransactionSummaryProps {
  roundResult: RoundResult;
  language: Language;
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({
  roundResult,
  language,
}) => {
  const t = translations[language];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 my-4">
      <div className="flex items-center gap-2 mb-3">
        <Coins className="w-4 h-4 text-amber-400" />
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          {t.transactionSummary}
        </h4>
      </div>

      <div className="space-y-2">
        {roundResult.transactions.map((tx: Transaction) => (
          <div
            key={tx.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs"
          >
            <div className="flex items-center gap-2 font-medium">
              <span className="text-rose-400 font-semibold">{tx.payerName}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-emerald-400 font-semibold">{tx.recipientName}</span>
            </div>

            <div className="text-slate-400 text-[11px] sm:max-w-xs truncate">
              {language === 'bn' ? tx.reasonBn : tx.reason}
            </div>

            <div className="flex items-center gap-1 font-mono font-bold text-amber-400 shrink-0 self-end sm:self-auto">
              <span>৳</span>
              <span className="tabular-nums text-sm">{tx.amount}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px] text-slate-500 text-center">
        {t.noDebtCapNote}
      </div>
    </div>
  );
};
