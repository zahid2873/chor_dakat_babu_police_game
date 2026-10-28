import React, { useState, useEffect } from 'react';
import { X, Users, Search, PlusCircle, Globe, Copy, Check, Sparkles, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface OnlineRoomHubProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerEmoji: string;
  onCreateRoom: (roomName: string, totalRounds: number, fillWithBots: boolean) => void;
  onJoinRoom: (roomId: string) => void;
  onJoinMatchmaking: () => void;
  matchmakingWaitingCount?: number;
  isMatchmakingActive?: boolean;
  onCancelMatchmaking?: () => void;
}

interface PublicRoomItem {
  id: string;
  name: string;
  playersCount: number;
  status: string;
}

export const OnlineRoomHub: React.FC<OnlineRoomHubProps> = ({
  isOpen,
  onClose,
  playerName,
  playerEmoji,
  onCreateRoom,
  onJoinRoom,
  onJoinMatchmaking,
  matchmakingWaitingCount = 1,
  isMatchmakingActive = false,
  onCancelMatchmaking,
}) => {
  const [tab, setTab] = useState<'search' | 'create' | 'matchmaking'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsList, setRoomsList] = useState<PublicRoomItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Create room state
  const [newRoomName, setNewRoomName] = useState(`${playerName}-এর বেঞ্চ`);
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [fillWithBots, setFillWithBots] = useState(true);

  // Manual code input
  const [manualCode, setManualCode] = useState('');

  // Fetch rooms from server
  const fetchRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const res = await fetch(`/api/rooms/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setRoomsList(data.rooms || []);
      }
    } catch {
      // Fallback local sample rooms
      setRoomsList([
        { id: 'CP8801', name: 'ঢাকা কলেজ আড্ডা', playersCount: 2, status: 'waiting' },
        { id: 'CP4120', name: 'ক্লাসরুম শেষ বেঞ্চ', playersCount: 3, status: 'waiting' },
        { id: 'CP9055', name: 'নস্টালজিক বন্ধুরা', playersCount: 1, status: 'waiting' },
      ]);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
    }
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-xl notebook-ruled-page p-5 sm:p-7 rounded-2xl shadow-2xl border-2 border-amber-600 text-slate-900 font-serif max-h-[92vh] flex flex-col justify-between overflow-y-auto animate-in zoom-in-95 duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-blue-400 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-700" />
              <div>
                <h3 className="text-xl font-bold ink-blue-text">
                  মাল্টিপ্লেয়ার ও অনলাইন রুম 🌐
                </h3>
                <div className="text-xs text-slate-600 font-mono">
                  খেলোয়াড়: <span className="font-bold text-blue-900">{playerEmoji} {playerName}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-amber-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex p-1 bg-blue-100/70 border border-blue-300 rounded-xl mb-4 text-xs font-bold font-serif">
            <button
              type="button"
              onClick={() => setTab('search')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'search'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-blue-900 hover:bg-blue-200/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>রুম খুঁজুন (Search)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('create')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'create'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-blue-900 hover:bg-blue-200/50'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>রুম তৈরি (Create)</span>
            </button>

            <button
              type="button"
              onClick={() => setTab('matchmaking')}
              className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                tab === 'matchmaking'
                  ? 'bg-blue-700 text-white shadow'
                  : 'text-blue-900 hover:bg-blue-200/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>র্যান্ডম ৪ জন (Random 4)</span>
            </button>
          </div>

          {/* TAB 1: SEARCH & BROWSE ROOMS */}
          {tab === 'search' && (
            <div className="space-y-4">
              {/* Search Bar + Direct Code Entry */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="রুমের নাম বা কোড দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-blue-300 rounded-xl text-xs sm:text-sm font-serif text-slate-900 focus:outline-none focus:border-blue-600 shadow-inner"
                  />
                </div>

                <button
                  type="button"
                  onClick={fetchRooms}
                  className="p-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-900 rounded-xl transition-colors"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Direct Code Join Strip */}
              <div className="p-3 bg-white/70 border border-blue-200 rounded-xl flex items-center gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="৫ অক্ষরের রুম কোড (যেমন: CP1234)"
                  maxLength={7}
                  className="flex-1 py-1.5 px-3 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold uppercase text-blue-950 focus:outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (manualCode.trim()) {
                      sound.playPaperRustle();
                      onJoinRoom(manualCode.trim());
                    }
                  }}
                  disabled={!manualCode.trim()}
                  className="py-1.5 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold font-serif transition-colors"
                >
                  কোডে যোগ দিন
                </button>
              </div>

              {/* Room Cards List */}
              <div className="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  খোলা রুমসমূহ ({roomsList.length}):
                </div>

                {roomsList.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    কোনো সক্রিয় পাবলিক রুম পাওয়া যায়নি। আপনি নতুন একটি রুম তৈরি করতে পারেন!
                  </div>
                ) : (
                  roomsList.map((room) => (
                    <div
                      key={room.id}
                      className="p-3 bg-white/80 hover:bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between transition-colors shadow-sm"
                    >
                      <div>
                        <div className="font-bold text-blue-950 text-xs sm:text-sm">
                          {room.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                          <span>কোড: <strong className="text-blue-800">{room.id}</strong></span>
                          <span>·</span>
                          <span className="text-emerald-700 font-bold">{room.playersCount}/৪ জন</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playPaperRustle();
                          onJoinRoom(room.id);
                        }}
                        className="py-1.5 px-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold font-serif transition-all shadow"
                      >
                        প্রবেশ করুন 🚪
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE ROOM */}
          {tab === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  রুমের নাম (Room Name):
                </label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="যেমন: ক্লাসরুম শেষ বেঞ্চ..."
                  maxLength={30}
                  className="w-full py-2 px-3 bg-white border border-blue-300 rounded-xl text-xs sm:text-sm font-serif text-slate-900 focus:outline-none focus:border-blue-600 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">
                  ম্যাচ রাউন্ড সংখ্যা:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 10].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRounds(r)}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                        selectedRounds === r
                          ? 'border-blue-600 bg-blue-700 text-white shadow'
                          : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-50'
                      }`}
                    >
                      {r} রাউন্ড
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot fill option */}
              <div className="p-3 bg-white/70 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-950 text-xs">
                    বাকি আসনগুলোতে বট যুক্ত করুন (Auto-Fill Bots)
                  </div>
                  <div className="text-[10px] text-slate-500">
                    বন্ধুরা না আসা পর্যন্ত দ্রুত ম্যাচ শুরু করতে সাহায্য করবে।
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={fillWithBots}
                  onChange={(e) => setFillWithBots(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playPaperRustle();
                  onCreateRoom(newRoomName, selectedRounds, fillWithBots);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>রুম তৈরি করুন ও কোড শেয়ার করুন</span>
              </button>
            </div>
          )}

          {/* TAB 3: RANDOM 4 PLAYERS MATCHMAKING */}
          {tab === 'matchmaking' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-400 text-blue-700 flex items-center justify-center mx-auto mb-2">
                <Globe className={`w-8 h-8 ${isMatchmakingActive ? 'animate-spin' : ''}`} />
              </div>

              <h4 className="text-base font-bold text-blue-950">
                অনলাইন র্যান্ডম ৪ জন ম্যাচমেকিং
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                অন্যান্য ৩ জন র্যান্ডম অনলাইন খেলোয়াড় লাইনে যুক্ত হওয়ার সাথে সাথেই স্বয়ংক্রিয়ভাবে ৪ জনের একটি নতুন রুম তৈরি হবে এবং খেলা শুরু হবে!
              </p>

              {isMatchmakingActive ? (
                <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl">
                  <div className="text-xs font-bold text-blue-800 animate-pulse mb-2">
                    খেলোয়াড় খোঁজা হচ্ছে... ({matchmakingWaitingCount}/৪ জন প্রস্তুত)
                  </div>
                  <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${(matchmakingWaitingCount / 4) * 100}%` }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPaperRustle();
                        onCreateRoom('দ্রুত বট ম্যাচ', 5, true);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow"
                    >
                      বট দিয়ে এখনই শুরু করুন 🤖
                    </button>
                    {onCancelMatchmaking && (
                      <button
                        type="button"
                        onClick={onCancelMatchmaking}
                        className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg"
                      >
                        বাতিল
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    onJoinMatchmaking();
                  }}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>৪ জনের র্যান্ডম রুমে প্রবেশ করুন</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-red-300 text-[11px] text-slate-500 text-center">
          * বন্ধুদের সাথে রুম কোড শেয়ার করে এক ক্লিকে একই কাঠের বেঞ্চে বসে খেলুন।
        </div>
      </div>
    </div>
  );
};
