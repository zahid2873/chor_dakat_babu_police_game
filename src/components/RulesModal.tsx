import React from 'react';
import { X, BookOpen, Check, AlertCircle, Shield, Award } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen) return null;
  const t = translations[language];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">{t.rules}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-5 text-sm text-slate-300">
          {/* Overview */}
          <section>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? '১. খেলার মূল উদ্দেশ্য' : '1. Core Objective'}
            </h4>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-300">
              {language === 'bn'
                ? 'চোর পুলিশ ডাকাত বাবু একটি ঐতিহ্যবাহী বাঙালি সামাজিক বুদ্ধিভিত্তিক কার্ড খেলা। চারজন খেলোয়াড় প্রত্যেকে একটি করে গোপন ভূমিকা পাবেন। পুলিশকে বের করতে হবে লক্ষ্যবস্তু অপরাধীকে। প্রতিটি খেলায় ভার্চুয়াল টাকার লেনদেন হবে।'
                : 'Chor Police Dakat Babu is an authentic Bengali social deduction and guessing card game. Four players each receive a secret role. Police attempts to identify the hidden target criminal, with automated virtual Taka transfers.'}
            </p>
          </section>

          {/* 4 Roles Table */}
          <section>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? '২. চারটি ভূমিকা' : '2. The Four Roles'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="font-bold text-amber-400 mb-1">
                  {language === 'bn' ? 'বাবু (Babu) — প্রকাশ্য' : 'Babu (The Aristocrat) — Public'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'bn'
                    ? 'আদালতের বিচারক। প্রতিটি মামলার নিষ্পত্তিতে ৩ টাকা ফি গ্রহণ করেন।'
                    : 'The court magistrate. Receives ৳3 fee in every completed case settlement.'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="font-bold text-sky-400 mb-1">
                  {language === 'bn' ? 'পুলিশ (Police) — প্রকাশ্য' : 'Police (The Inspector) — Public'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'bn'
                    ? 'তদন্তকারী কর্মকর্তা। গোপন দুজন আসামির মধ্য থেকে আসল লক্ষ্যবস্তুকে চিহ্নিত করেন।'
                    : 'The detective officer. Must guess which of the two hidden suspects is the target.'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="font-bold text-purple-400 mb-1">
                  {language === 'bn' ? 'চোর (Chor) — গোপন' : 'Chor (The Thief) — Hidden'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'bn'
                    ? 'আড়ালে লুকিয়ে থাকে। লক্ষ্যবস্তু হিসেবে ধরা না পড়ার চেষ্টা করে।'
                    : 'Remains hidden in shadows and tries to avoid being accused when targeted.'}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                <div className="font-bold text-rose-400 mb-1">
                  {language === 'bn' ? 'ডাকাত (Dakat) — গোপন' : 'Dakat (The Bandit) — Hidden'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  {language === 'bn'
                    ? 'দুর্ধর্ষ অপরাধী। আড়ালে থাকে এবং পুলিশের ভুল তদন্তের সুযোগ নেয়।'
                    : 'Formidable outlaw who remains secret and profits when Police accuses wrongly.'}
                </div>
              </div>
            </div>
          </section>

          {/* Money Transfer Rules */}
          <section>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? '৩. টাকার লেনদেন (Version C নিয়ম)' : '3. Money Transfers (Version C Rules)'}
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-emerald-950/30 border border-emerald-600/30 rounded-lg">
                <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সঠিক অনুমান (Correct Guess)' : 'Correct Guess (Target Caught)'}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>
                    {language === 'bn'
                      ? 'ধৃত অপরাধী পুলিশকে দেবে ২ টাকা (পুরস্কার)'
                      : 'Caught criminal pays ৳2 to Police (reward)'}
                  </li>
                  <li>
                    {language === 'bn'
                      ? 'ধৃত অপরাধী বাবুকে দেবে ৩ টাকা (দরবার ফি)'
                      : "Caught criminal pays ৳3 to Babu (Babu's fee)"}
                  </li>
                  <li className="text-emerald-300 font-semibold">
                    {language === 'bn'
                      ? 'মোট কর্তন: ধৃত আসামির ৫ টাকা কমবে, পুলিশের ২ টাকা বাড়বে, বাবুর ৩ টাকা বাড়বে।'
                      : "Net effect: Caught player loses ৳5; Police gains ৳2, Babu gains ৳3."}
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-rose-950/30 border border-rose-600/30 rounded-lg">
                <div className="font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ভুল অনুমান (Wrong Guess)' : 'Wrong Guess (Police Failed)'}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>
                    {language === 'bn'
                      ? 'পুলিশ আসল লক্ষ্য অপরাধীকে দেবে ২ টাকা (ক্ষতিপূরণ)'
                      : 'Police pays ৳2 to the actual target criminal (penalty)'}
                  </li>
                  <li>
                    {language === 'bn'
                      ? 'পুলিশ বাবুকে দেবে ৩ টাকা (দরবার ফি)'
                      : "Police pays ৳3 to Babu (Babu's fee)"}
                  </li>
                  <li className="text-rose-300 font-semibold">
                    {language === 'bn'
                      ? 'মোট কর্তন: পুলিশের ৫ টাকা কমবে, আসল অপরাধীর ২ টাকা বাড়বে, বাবুর ৩ টাকা বাড়বে।'
                      : 'Net effect: Police loses ৳5; actual target criminal gains ৳2, Babu gains ৳3.'}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* End Condition */}
          <section>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? '৪. খেলা শেষ ও বিজয়ী' : '4. Match End & Winner'}
            </h4>
            <p className="leading-relaxed text-xs sm:text-sm text-slate-300">
              {language === 'bn'
                ? 'প্রত্যেক খেলোয়াড় ২৫ টাকা নিয়ে শুরু করেন। যেকোনো খেলোয়াড়ের জমানো টাকা শূন্য (৳০) বা তার নিচে পৌঁছালে ম্যাচ তৎক্ষণাৎ শেষ হবে। তখন যার কাছে সবচেয়ে বেশি টাকা থাকবে, তিনিই বিজয়ী ঘোষিত হবেন।'
                : 'Each player starts with ৳25 virtual Taka. If any player reaches ৳0 or below after settlement, the match ends immediately. The player with the highest remaining balance wins!'}
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {language === 'bn' ? 'বুঝেছি' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
