import React, { useState } from 'react';
import { X, Users, Copy, Check, Sparkles, Globe, Play } from 'lucide-react';
import { sound } from '../utils/audio';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRoomMatch: (roomCode: string, mode: 'friends' | 'global') => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onStartRoomMatch,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'global'>('create');
  const [generatedCode, setGeneratedCode] = useState(() =>
    Math.random().toString(36).substring(2, 7).toUpperCase()
  );
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-amber-950 border-2 border-amber-700/80 rounded-2xl p-6 shadow-2xl text-amber-100 font-serif">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-800/80 mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">
              অনলাইন মাল্টিপ্লেয়ার রুম (Room Code)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-400 hover:text-white hover:bg-amber-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1 bg-amber-900/60 rounded-xl mb-5 text-xs font-semibold">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              tab === 'create'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            রুম তৈরি করুন
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              tab === 'join'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            কোড দিয়ে যোগ দিন
          </button>
          <button
            onClick={() => setTab('global')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              tab === 'global'
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-amber-300 hover:text-white'
            }`}
          >
            র্যান্ডম ম্যাচ
          </button>
        </div>

        {/* Tab 1: Create Room */}
        {tab === 'create' && (
          <div className="space-y-4 text-center">
            <div className="text-xs text-amber-300">
              নিচের ৫ অক্ষরের রুম কোডটি বন্ধুদের সাথে শেয়ার করুন:
            </div>

            <div className="flex items-center justify-center gap-3 p-4 bg-black/40 border-2 border-dashed border-amber-600 rounded-xl">
              <span className="text-3xl font-mono font-black tracking-widest text-amber-400">
                {generatedCode}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 bg-amber-700 hover:bg-amber-600 rounded-lg text-white transition-colors"
                title="কোড কপি করুন"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-[11px] text-amber-400/80 leading-relaxed">
              * ৪ জন না হলে বাকি খালি আসনগুলোতে হাইব্রিড AI বট স্বয়ংক্রিয়ভাবে যোগ দিয়ে ম্যাচ শুরু করবে।
            </p>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onStartRoomMatch(generatedCode, 'friends');
              }}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>রুম চালু করুন ও চিরকুট ওড়ান</span>
            </button>
          </div>
        )}

        {/* Tab 2: Join Room */}
        {tab === 'join' && (
          <div className="space-y-4">
            <div className="text-xs text-amber-300">
              বন্ধুর শেয়ার করা ৫ অক্ষরের কোড লিখুন:
            </div>

            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="যেমন: CPDB1"
              maxLength={6}
              className="w-full py-3 px-4 bg-black/50 border border-amber-700 rounded-xl text-center font-mono font-bold text-xl text-amber-300 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              onClick={() => {
                if (inputCode.trim()) {
                  sound.playPaperRustle();
                  onStartRoomMatch(inputCode.trim(), 'friends');
                }
              }}
              disabled={!inputCode.trim()}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>রুমে প্রবেশ করুন</span>
            </button>
          </div>
        )}

        {/* Tab 3: Random Matchmaking */}
        {tab === 'global' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Globe className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-bold text-white">
              অনলাইন প্লেয়ার ম্যাচমেকিং
            </h4>
            <p className="text-xs text-amber-300/80 max-w-xs mx-auto leading-relaxed">
              বাংলাদেশ ও প্রবাসের অন্যান্য নস্টালজিক প্লেয়ারদের সাথে ৪ জনের ম্যাচ তৎক্ষণাৎ যুক্ত হবে।
            </p>

            <button
              onClick={() => {
                sound.playPaperRustle();
                onStartRoomMatch('GLOBAL-' + Math.floor(100 + Math.random() * 900), 'global');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>দ্রুত প্লেয়ার খুঁজুন ও খেলুন</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
