import React from 'react';
import { BookOpen } from 'lucide-react';
import { Modal } from './Modal';

interface RulesModalProps {
  onClose: () => void;
}

const RULES = [
  {
    title: '👑 বাবু — ১০০০ পয়েন্ট',
    body: 'চিরকুট খোলার পর সবার সামনে প্রকাশ পায়। বাবুর পয়েন্ট নিশ্চিত।',
    tone: 'bg-emerald-50 border-emerald-200',
  },
  {
    title: '👮 পুলিশ — ৫০০ পয়েন্ট',
    body: 'বাবুর সাথে পুলিশও প্রকাশ পায়। পুলিশ ঠিক করে চোর না ডাকাত খুঁজবে, তারপর বাকি দুই গোপন চিরকুটের একটি বেছে নেয়। সঠিক হলে ৫০০, ভুল হলে ০।',
    tone: 'bg-blue-50 border-blue-200',
  },
  {
    title: '🗡️ ডাকাত — ৪০০ পয়েন্ট',
    body: 'চিরকুট গোপন থাকে। পুলিশ ডাকাত খুঁজে সঠিকভাবে ধরলে ০, নাহলে ৪০০ পয়েন্ট।',
    tone: 'bg-rose-50 border-rose-200',
  },
  {
    title: '🥷 চোর — ১০০ পয়েন্ট',
    body: 'চিরকুট গোপন থাকে। পুলিশ চোর খুঁজে সঠিকভাবে ধরলে ০, নাহলে ১০০ পয়েন্ট।',
    tone: 'bg-purple-50 border-purple-200',
  },
];

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => (
  <Modal
    onClose={onClose}
    className="max-w-xl border-amber-300"
    icon={<BookOpen className="w-6 h-6 text-blue-700 shrink-0" />}
    title="খেলার নিয়ম ও পয়েন্ট 📜"
    subtitle="প্রতি রাউন্ডে চারজন চারটি চিরকুট পায়"
  >
    <div className="space-y-2.5 text-sm leading-relaxed font-bangla-hand">
      {RULES.map((r) => (
        <div key={r.title} className={`p-3 rounded-lg border ${r.tone}`}>
          <strong>{r.title}</strong>
          <div>{r.body}</div>
        </div>
      ))}
      <p className="text-xs text-slate-600 pt-1">
        সব রাউন্ড শেষে খাতায় যার পয়েন্ট সবচেয়ে বেশি, সে-ই বিজয়ী।
      </p>
    </div>
    <div className="mt-5 flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg text-sm"
      >
        বুঝেছি, খেলা চালিয়ে যাই
      </button>
    </div>
  </Modal>
);
