import React, { useEffect, useState } from 'react';
import { Users, Search, PlusCircle, Globe, Sparkles, Play, RefreshCw, Share2, LogOut, Bot } from 'lucide-react';
import { sound } from '../utils/audio';
import { ROUND_OPTIONS, toBn } from '../utils/constants';
import { ROOMS_API } from '../utils/roomConnection';
import { Modal } from './Modal';

export interface WaitingRoom {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  hostPlayerId: string;
  totalRounds: number;
  players: { id: string; name: string; avatarEmoji: string; isBot: boolean; isOnline?: boolean }[];
}

interface OnlineRoomHubProps {
  onClose: () => void;
  playerId: string;
  playerName: string;
  playerEmoji: string;
  onCreateRoom: (roomName: string, totalRounds: number, fillWithBots: boolean) => void;
  onJoinRoom: (roomId: string) => void;
  onJoinMatchmaking: () => void;
  matchmakingWaitingCount: number;
  isMatchmakingActive: boolean;
  onCancelMatchmaking: () => void;
  waitingRoom: WaitingRoom | null;
  onStartWaitingRoom: () => void;
  onLeaveWaitingRoom: () => void;
  onShareRoom: () => void;
}

interface PublicRoomItem {
  id: string;
  name: string;
  playersCount: number;
  status: string;
  totalRounds?: number;
  currentRound?: number;
  canJoin?: boolean;
}

const LIST_REFRESH_MS = 5000;

type Tab = 'search' | 'create' | 'matchmaking';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'search', label: 'রুম খুঁজুন', icon: <Search className="w-4 h-4" aria-hidden /> },
  { id: 'create', label: 'রুম তৈরি', icon: <PlusCircle className="w-4 h-4" aria-hidden /> },
  { id: 'matchmaking', label: 'র্যান্ডম ৪', icon: <Globe className="w-4 h-4" aria-hidden /> },
];

const inputClass =
  'w-full py-2 px-3 bg-white border border-blue-300 rounded-xl text-base text-slate-900 focus:outline-none focus:border-blue-600';

export const OnlineRoomHub: React.FC<OnlineRoomHubProps> = (props) => {
  const { onClose, playerName, playerEmoji, waitingRoom } = props;

  return (
    <Modal
      onClose={onClose}
      className="max-w-xl border-amber-600"
      icon={<Users className="w-6 h-6 text-blue-700 shrink-0" />}
      title="অনলাইন রুম 🌐"
      subtitle={
        <>
          খেলোয়াড়: <span className="font-bold text-blue-900">{playerEmoji} {playerName}</span>
        </>
      }
    >
      {waitingRoom ? <WaitingRoomPanel {...props} room={waitingRoom} /> : <HubTabs {...props} />}
    </Modal>
  );
};

const WaitingRoomPanel: React.FC<OnlineRoomHubProps & { room: WaitingRoom }> = ({
  room,
  playerId,
  onStartWaitingRoom,
  onLeaveWaitingRoom,
  onShareRoom,
}) => {
  const host = room.players.find((p) => p.id === room.hostPlayerId);
  const isHost = room.hostPlayerId === playerId;
  // The server lets anyone start once the host has gone quiet
  const canStart = isHost || host?.isOnline === false;
  const seats = Array.from({ length: 4 }, (_, i) => room.players[i]);
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white/80 border border-blue-200 rounded-xl text-center">
        <div className="text-sm text-slate-600">
          {room.name} · {toBn(room.totalRounds)} রাউন্ড
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="text-3xl font-black tracking-widest text-blue-900 font-mono my-1 px-2 rounded-lg hover:bg-blue-50"
          aria-label={`রুম কোড ${room.id} কপি করুন`}
          title="কোড কপি করুন"
        >
          {room.id}
        </button>
        <div className="text-[11px] text-slate-500 h-4">{copied ? '✓ কোড কপি হয়েছে' : 'কোডে চাপ দিলে কপি হবে'}</div>
        <button
          type="button"
          onClick={onShareRoom}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-lg"
        >
          <Share2 className="w-4 h-4" aria-hidden />
          আমন্ত্রণ লিংক শেয়ার করুন
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" aria-live="polite">
        {seats.map((p, i) =>
          p ? (
            <div
              key={p.id}
              className={`p-2.5 bg-white/90 border rounded-xl flex items-center gap-2 text-sm anim-pop ${
                p.isOnline === false ? 'border-slate-300 opacity-60' : 'border-emerald-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${p.isOnline === false ? 'bg-slate-400' : 'bg-emerald-500'}`}
                aria-label={p.isOnline === false ? 'অফলাইন' : 'অনলাইন'}
              />
              <span className="text-xl" aria-hidden>{p.avatarEmoji}</span>
              <span className="font-bold truncate">
                {p.name}
                {p.id === playerId && <span className="text-[10px] text-slate-500 font-normal"> (আপনি)</span>}
              </span>
              {p.id === room.hostPlayerId && <span className="text-[11px] ml-auto shrink-0" title="হোস্ট">👑</span>}
            </div>
          ) : (
            <div key={`empty-${i}`} className="p-2.5 border-2 border-dashed border-blue-200 rounded-xl text-sm text-slate-400 text-center seat-waiting">
              অপেক্ষা করছে…
            </div>
          )
        )}
      </div>

      <p className="text-xs text-slate-600 text-center">
        {isHost
          ? 'বন্ধুরা এলে শুরু করুন। খালি বা অফলাইন আসনে বট বসবে।'
          : canStart
          ? 'হোস্ট অফলাইন — আপনি খেলা শুরু করতে পারেন।'
          : `হোস্ট ${host?.name ?? ''} খেলা শুরু করার অপেক্ষায়…`}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onLeaveWaitingRoom}
          className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-xl flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          ছেড়ে দিন
        </button>
        {canStart && (
          <button
            type="button"
            onClick={() => {
              sound.playChitDrop();
              onStartWaitingRoom();
            }}
            className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden />
            খেলা শুরু করুন ({toBn(room.players.length)}/৪)
          </button>
        )}
      </div>
    </div>
  );
};

const HubTabs: React.FC<OnlineRoomHubProps> = ({
  playerName,
  onCreateRoom,
  onJoinRoom,
  onJoinMatchmaking,
  matchmakingWaitingCount,
  isMatchmakingActive,
  onCancelMatchmaking,
}) => {
  const [tab, setTab] = useState<Tab>(isMatchmakingActive ? 'matchmaking' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomsList, setRoomsList] = useState<PublicRoomItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  const [newRoomName, setNewRoomName] = useState(`${playerName}-এর বেঞ্চ`);
  const [selectedRounds, setSelectedRounds] = useState(5);
  const [fillWithBots, setFillWithBots] = useState(true);
  const [manualCode, setManualCode] = useState('');

  // Debounced room search that keeps itself fresh; stale responses are dropped via AbortController
  useEffect(() => {
    if (tab !== 'search') return;
    const controller = new AbortController();
    let first = true;
    let refresh: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      if (first) setLoadState('loading');
      first = false;
      try {
        const res = await fetch(`${ROOMS_API}/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setRoomsList(data.rooms || []);
        setLoadState('ok');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setLoadState('error');
      }
    };
    const t = setTimeout(() => {
      load();
      refresh = setInterval(load, LIST_REFRESH_MS);
    }, 300);
    return () => {
      clearTimeout(t);
      clearInterval(refresh);
      controller.abort();
    };
  }, [tab, searchQuery, reloadKey]);

  const join = (code: string) => {
    sound.playPaperRustle();
    onJoinRoom(code);
  };

  return (
    <>
      <div className="flex p-1 bg-blue-100/70 border border-blue-300 rounded-xl mb-4 text-sm font-bold" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id ? 'bg-blue-700 text-white shadow' : 'text-blue-900 hover:bg-blue-200/50'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-3" role="tabpanel">
          <form
            className="p-3 bg-white/70 border border-blue-200 rounded-xl flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualCode.trim()) join(manualCode.trim());
            }}
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="রুম কোড (যেমন: CP1234)"
              aria-label="রুম কোড"
              maxLength={8}
              autoCapitalize="characters"
              className="flex-1 min-w-0 py-1.5 px-3 bg-white border border-blue-300 rounded-lg text-base font-mono font-bold uppercase text-blue-950 focus:outline-none focus:border-blue-600"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="py-2 px-4 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
            >
              যোগ দিন
            </button>
          </form>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="রুমের নাম দিয়ে খুঁজুন..."
                aria-label="রুম খুঁজুন"
                className={`${inputClass} pl-9`}
              />
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="p-2.5 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-900 rounded-xl transition-colors"
              aria-label="রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1" aria-live="polite">
            {loadState === 'error' ? (
              <div className="text-center py-6 text-rose-700 text-sm">
                অনলাইন সার্ভারে সংযোগ করা যায়নি। একটু পরে আবার চেষ্টা করুন।
              </div>
            ) : loadState === 'ok' && roomsList.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                কোনো খোলা রুম নেই। নতুন একটি রুম তৈরি করুন!
              </div>
            ) : (
              roomsList.map((room) => (
                <div
                  key={room.id}
                  className="p-3 bg-white/80 hover:bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-blue-950 text-sm truncate">{room.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono">
                        <strong className="text-blue-800">{room.id}</strong>
                      </span>
                      <span className="flex items-center gap-0.5" aria-label={`${room.playersCount} জন খেলোয়াড়`}>
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={`w-2 h-2 rounded-full ${i < room.playersCount ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        ))}
                        <span className="ml-1 text-emerald-700 font-bold">{toBn(room.playersCount)}/৪</span>
                      </span>
                      {room.status === 'playing' ? (
                        <span className="px-1.5 rounded bg-amber-100 text-amber-800 font-bold">
                          খেলা চলছে{room.currentRound ? ` · রাঃ ${toBn(room.currentRound)}/${toBn(room.totalRounds ?? 0)}` : ''}
                        </span>
                      ) : (
                        <span className="px-1.5 rounded bg-emerald-100 text-emerald-800 font-bold">অপেক্ষায়</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => join(room.id)}
                    disabled={room.canJoin === false}
                    className="py-2 px-3.5 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-400 text-white rounded-lg text-sm font-bold transition-colors shrink-0"
                  >
                    {room.canJoin === false ? 'পূর্ণ' : room.status === 'playing' ? 'বটের জায়গায় বসুন' : 'প্রবেশ 🚪'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'create' && (
        <form
          className="space-y-4"
          role="tabpanel"
          onSubmit={(e) => {
            e.preventDefault();
            sound.playPaperRustle();
            onCreateRoom(newRoomName.trim() || `${playerName}-এর বেঞ্চ`, selectedRounds, fillWithBots);
          }}
        >
          <label className="block">
            <span className="block text-sm font-bold text-blue-950 mb-1">রুমের নাম:</span>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="যেমন: ক্লাসরুম শেষ বেঞ্চ..."
              maxLength={30}
              className={inputClass}
            />
          </label>

          <fieldset>
            <legend className="text-sm font-bold text-blue-950 mb-1">রাউন্ড সংখ্যা:</legend>
            <div className="grid grid-cols-3 gap-2">
              {ROUND_OPTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={selectedRounds === r}
                  onClick={() => setSelectedRounds(r)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all border ${
                    selectedRounds === r ? 'border-blue-600 bg-blue-700 text-white shadow' : 'border-blue-200 bg-white text-blue-900 hover:bg-blue-50'
                  }`}
                >
                  {toBn(r)} রাউন্ড
                </button>
              ))}
            </div>
          </fieldset>

          <label className="p-3 bg-white/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="block font-bold text-blue-950 text-sm">বাকি আসনে এখনই বট বসান</span>
              <span className="block text-xs text-slate-500">
                বন্ধ রাখলে রুমে অপেক্ষা করে বন্ধুদের নিয়ে শুরু করতে পারবেন। বন্ধু এলে বটের জায়গায় বসবে।
              </span>
            </span>
            <input
              type="checkbox"
              checked={fillWithBots}
              onChange={(e) => setFillWithBots(e.target.checked)}
              className="w-5 h-5 shrink-0 accent-blue-700"
            />
          </label>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl text-base shadow-md transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4" aria-hidden />
            রুম তৈরি করুন
          </button>
        </form>
      )}

      {tab === 'matchmaking' && (
        <div className="space-y-4 text-center py-2" role="tabpanel">
          <div className="w-16 h-16 rounded-full bg-blue-100 border-2 border-blue-400 text-blue-700 flex items-center justify-center mx-auto">
            <Globe className={`w-8 h-8 ${isMatchmakingActive ? 'animate-spin [animation-duration:3s]' : ''}`} aria-hidden />
          </div>
          <h4 className="text-base font-bold text-blue-950">র্যান্ডম ৪ জনের ম্যাচ</h4>
          <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            আরও ৩ জন অনলাইন খেলোয়াড় যুক্ত হলেই স্বয়ংক্রিয়ভাবে নতুন রুমে খেলা শুরু হবে।
          </p>

          {isMatchmakingActive ? (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-xl" aria-live="polite">
              <div className="text-sm font-bold text-blue-800 mb-2">
                খেলোয়াড় খোঁজা হচ্ছে... ({toBn(matchmakingWaitingCount)}/৪ জন প্রস্তুত)
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden mb-3" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={matchmakingWaitingCount}>
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${(matchmakingWaitingCount / 4) * 100}%` }} />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPaperRustle();
                    onCancelMatchmaking();
                    onCreateRoom('দ্রুত বট ম্যাচ', 5, true);
                  }}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-1.5"
                >
                  <Bot className="w-4 h-4" aria-hidden />
                  বট দিয়ে এখনই শুরু
                </button>
                <button
                  type="button"
                  onClick={onCancelMatchmaking}
                  className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-lg"
                >
                  বাতিল
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.playPaperRustle();
                onJoinMatchmaking();
              }}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-base shadow-md transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" aria-hidden />
              লাইনে দাঁড়ান
            </button>
          )}
        </div>
      )}
    </>
  );
};
