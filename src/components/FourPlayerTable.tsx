import React, { useEffect, useState } from 'react';
import { GameMode, PaperPlayer, RoomReaction, RoundPhase, TargetRole } from '../types/game';
import { QUICK_EMOJIS, QUICK_PHRASES, ROLE_DEFINITIONS, isSuspectRole, toBn } from '../utils/constants';
import { Crown, Shield, Search, CheckCircle2, XCircle, ArrowRight, NotebookPen, LogOut, Timer } from 'lucide-react';
import benchUrl from '../assets/images/school-bench.webp';

const REACTION_SHOW_MS = 4000;
const REACT_COOLDOWN_MS = 900;

// Re-render on an interval while something on screen is counting down.
function useNow(active: boolean, intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}

const secondsLeft = (until: number | undefined, now: number) =>
  until === undefined ? undefined : Math.max(0, Math.ceil((until - now) / 1000));

interface FourPlayerTableProps {
  players: PaperPlayer[];
  humanPlayerId: string;
  gameMode: GameMode;
  targetRoleToCatch: TargetRole;
  onSetTargetRoleToCatch: (role: TargetRole) => void;
  onAccuseSuspect: (suspectPlayerId: string) => void;
  isBotPoliceThinking: boolean;
  roundPhase: RoundPhase;
  accusedPlayerId: string | null;
  isCorrectGuess: boolean;
  onNextRound: () => void;
  onOpenScoreKhata: () => void;
  currentRound: number;
  totalRounds: number;
  // Online rooms only
  roomName?: string;
  /** Local-clock time the police's turn runs out */
  turnEndsAt?: number;
  /** Local-clock time the next round starts on its own */
  nextRoundAt?: number;
  wasAutoAccused?: boolean;
  reactions?: RoomReaction[];
  serverOffset?: number;
  onReact?: (text: string) => void;
  onLeave?: () => void;
}

type Seat = 'top' | 'left' | 'right' | 'bottom';

// Mobile stacks top → left|right → action panel → bottom; sm+ is a true 4-sided table.
const SEAT_LAYOUT: Record<Seat, string> = {
  top: 'col-span-2 sm:col-span-3 order-1 sm:order-none justify-center',
  left: 'order-2 sm:order-none justify-start',
  right: 'order-3 sm:order-none justify-end',
  bottom: 'col-span-2 sm:col-span-3 order-5 sm:order-none justify-center',
};

const TARGET_LABEL: Record<TargetRole, string> = { dakat: 'ডাকাত', chor: 'চোর' };

export const FourPlayerTable: React.FC<FourPlayerTableProps> = ({
  players,
  humanPlayerId,
  gameMode,
  targetRoleToCatch,
  onSetTargetRoleToCatch,
  onAccuseSuspect,
  isBotPoliceThinking,
  roundPhase,
  accusedPlayerId,
  isCorrectGuess,
  onNextRound,
  onOpenScoreKhata,
  currentRound,
  totalRounds,
  roomName,
  turnEndsAt,
  nextRoundAt,
  wasAutoAccused = false,
  reactions,
  serverOffset = 0,
  onReact,
  onLeave,
}) => {
  const isPassAndPlay = gameMode === 'passAndPlay';
  const isOnlineRoom = gameMode === 'online';
  const isResolved = roundPhase === 'resolved';
  const now = useNow(turnEndsAt !== undefined || nextRoundAt !== undefined || !!reactions?.length);
  const turnSecs = secondsLeft(turnEndsAt, now);
  const nextSecs = secondsLeft(nextRoundAt, now);

  // Newest live reaction per player, shown as a bubble on their seat
  const liveReactions = new Map<string, RoomReaction>();
  for (const r of reactions || []) {
    if (r.at - serverOffset > now - REACTION_SHOW_MS) liveReactions.set(r.playerId, r);
  }

  // Rotate seats so this device's player always sits at the bottom
  const selfIdx = isPassAndPlay ? 0 : Math.max(0, players.findIndex((p) => p.id === humanPlayerId));
  const [bottomPlayer, leftPlayer, topPlayer, rightPlayer] = [0, 1, 2, 3].map((i) => players[(selfIdx + i) % 4]);

  const babuPlayer = players.find((p) => p.role === 'babu')!;
  const policePlayer = players.find((p) => p.role === 'police')!;
  const accused = players.find((p) => p.id === accusedPlayerId);

  // Pass & Play: whoever holds Police taps on the shared screen. Otherwise only the police's own device.
  const isPoliceTurn =
    !isResolved && !policePlayer.isBot && (isPassAndPlay || policePlayer.id === humanPlayerId);
  const isLastRound = currentRound >= totalRounds;

  const renderSeat = (player: PaperPlayer, seat: Seat) => {
    const isSelf = !isPassAndPlay && player.id === humanPlayerId;
    const isSuspect = isSuspectRole(player.role);
    const isPublic = isResolved || !isSuspect;
    // Your own folded chit is visible to you alone (bots / online)
    const isPrivatePeek = !isPublic && isSelf && player.role !== 'hidden';
    const isOpen = (isPublic || isPrivatePeek) && player.role !== 'hidden';
    const roleDef = player.role !== 'hidden' ? ROLE_DEFINITIONS[player.role] : null;
    const isEligibleSuspect = isPoliceTurn && isSuspect && !isSelf;
    const isAccused = accusedPlayerId === player.id;
    const lastEarned = isResolved ? player.scoreHistory[player.scoreHistory.length - 1] : undefined;

    const ringClass = isAccused
      ? isCorrectGuess
        ? 'border-emerald-600 ring-4 ring-emerald-400'
        : 'border-rose-600 ring-4 ring-rose-400'
      : player.role === 'babu'
      ? 'border-emerald-500'
      : player.role === 'police'
      ? 'border-blue-500'
      : 'border-amber-400';

    const reaction = liveReactions.get(player.id);
    const isOffline = player.isOnline === false;

    return (
      <div className={`flex ${SEAT_LAYOUT[seat]}`}>
        <div className="relative flex flex-col items-center gap-1.5 max-w-[11rem] sm:max-w-[13rem]">
          {reaction && (
            <div
              key={reaction.id}
              className={`reaction-bubble ${reaction.text.length > 2 ? 'text-sm' : 'text-3xl'}`}
              aria-live="polite"
            >
              {reaction.text}
            </div>
          )}
          {player.currentDialogue && !isResolved && isSuspect && !isSelf && (
            <div className="speech-bubble anim-float">“{player.currentDialogue}”</div>
          )}

          <button
            type="button"
            disabled={!isEligibleSuspect}
            onClick={() => onAccuseSuspect(player.id)}
            aria-label={
              isEligibleSuspect
                ? `${player.name}-কে ${TARGET_LABEL[targetRoleToCatch]} হিসেবে ধরুন`
                : `${player.name}-এর চিরকুট`
            }
            className={`rounded-md transition-transform duration-200 ${
              isEligibleSuspect
                ? 'cursor-pointer hover:scale-105 active:scale-95 ring-4 ring-amber-400 shadow-2xl suspect-pulse'
                : 'cursor-default'
            }`}
          >
            {!isOpen ? (
              <div className="w-[7.5rem] sm:w-36 h-[5.5rem] sm:h-24 paper-chit-crease rounded-sm flex flex-col items-center justify-center p-2 relative">
                <span className="text-lg" aria-hidden>📜</span>
                <span className="text-[11px] text-blue-900/70 font-bold">গোপন চিরকুট</span>
                {isEligibleSuspect && (
                  <span className="text-[11px] text-amber-950 font-bold bg-amber-300 px-2 py-0.5 rounded-full mt-1 shadow">
                    {TARGET_LABEL[targetRoleToCatch]} ঘোষণা 🎯
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`w-[7.5rem] sm:w-40 h-28 sm:h-32 notebook-ruled-page border-2 rounded-sm p-2 flex flex-col justify-between text-center relative overflow-hidden anim-pop ${ringClass}`}
              >
                <div className="text-[11px] text-red-700 font-bold border-b border-blue-200 pb-0.5 truncate">
                  {isPrivatePeek ? 'শুধু আপনি দেখছেন 🤫' : roleDef!.titleBn}
                </div>
                <div className="my-auto">
                  <div className="text-2xl sm:text-3xl font-extrabold ink-blue-text">
                    {roleDef!.emoji} {roleDef!.nameBn}
                  </div>
                  <div className="text-xs font-bold text-blue-900 mt-0.5 pen-stamp-circle inline-block px-2 bg-blue-50/70">
                    {toBn(roleDef!.points)} পয়েন্ট
                  </div>
                </div>
                {isAccused && (
                  <div className={`text-[11px] font-bold ${isCorrectGuess ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isCorrectGuess ? 'ধরা পড়েছে! 🚔' : 'ভুল আসামী!'}
                  </div>
                )}
              </div>
            )}
          </button>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 bg-black/80 border border-amber-700/80 rounded-full text-xs text-amber-200 shadow-lg max-w-full ${
              isOffline ? 'opacity-60' : ''
            }`}
          >
            {isOnlineRoom && !player.isBot && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${isOffline ? 'bg-slate-400' : 'bg-emerald-400 shadow-[0_0_6px_rgb(52_211_153)]'}`}
                title={isOffline ? 'অফলাইন' : 'অনলাইন'}
                aria-label={isOffline ? 'অফলাইন' : 'অনলাইন'}
              />
            )}
            <span aria-hidden>{player.avatarEmoji}</span>
            <span className="font-bold truncate">{player.name}</span>
            {isOnlineRoom && player.isBot && <span className="text-[10px] text-slate-400">বট</span>}
            {isOffline && <span className="text-[10px] text-slate-300">অফলাইন</span>}
            {isSelf && player.name !== 'আপনি' && <span className="text-[10px] text-amber-400">(আপনি)</span>}
            <span className="text-amber-400 font-bold whitespace-nowrap">{toBn(player.totalScore)}</span>
            {lastEarned !== undefined && (
              <span className={`font-bold whitespace-nowrap ${lastEarned > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                +{toBn(lastEarned)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const centerPanel = (
    <div className="col-span-2 sm:col-span-1 order-4 sm:order-none w-full max-w-md mx-auto p-4 sm:p-5 bg-amber-950/95 border-2 border-amber-600 rounded-2xl shadow-2xl text-center text-amber-100">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mb-3 pb-2 border-b border-amber-800 text-sm font-bangla-hand">
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          <Crown className="w-4 h-4" aria-hidden />
          বাবু: {babuPlayer.name}
        </span>
        <span className="text-blue-400 font-bold flex items-center gap-1">
          <Shield className="w-4 h-4" aria-hidden />
          পুলিশ: {policePlayer.name}
        </span>
      </div>

      {!isResolved && turnSecs !== undefined && !policePlayer.isBot && (
        <Countdown
          seconds={turnSecs}
          total={30}
          label={isPoliceTurn ? 'আপনার হাতে সময়' : `দারোগা ${policePlayer.name}-এর হাতে সময়`}
          urgent={turnSecs <= 10}
        />
      )}

      {!isResolved && (
        <div className="space-y-3 anim-fade" aria-live="polite">
          {isPoliceTurn ? (
            <>
              <div>
                <div className="text-sm text-amber-300 font-bold mb-1.5 font-bangla-hand">
                  দারোগা {policePlayer.name}, কাকে খুঁজবেন?
                </div>
                <div className="inline-flex p-1 bg-black/60 rounded-xl border border-amber-600 gap-1.5" role="radiogroup" aria-label="কাকে খুঁজবেন">
                  {(['dakat', 'chor'] as TargetRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      role="radio"
                      aria-checked={targetRoleToCatch === role}
                      onClick={() => onSetTargetRoleToCatch(role)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        targetRoleToCatch === role
                          ? role === 'dakat'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-purple-600 text-white shadow-md'
                          : 'text-amber-200/80 hover:text-white'
                      }`}
                    >
                      {TARGET_LABEL[role]} ({toBn(ROLE_DEFINITIONS[role].points)})
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-2.5 bg-blue-950/80 border border-blue-500/60 rounded-xl text-sm text-blue-100 flex items-center justify-center gap-1.5">
                <Search className="w-4 h-4 shrink-0" aria-hidden />
                <span>
                  যাকে {TARGET_LABEL[targetRoleToCatch]} মনে হয়, তার গোপন চিরকুটে চাপ দিন!
                </span>
              </div>
              {turnSecs !== undefined && (
                <div className="text-xs text-amber-300/80">সময় শেষ হলে আপনা-আপনি একজনকে ধরা হবে।</div>
              )}
            </>
          ) : (
            <div className="p-3 bg-blue-950/80 border border-blue-500/60 rounded-xl text-sm text-blue-200 flex items-center justify-center gap-1.5">
              <Search className={`w-4 h-4 shrink-0 ${isBotPoliceThinking ? 'animate-pulse' : ''}`} aria-hidden />
              <span>
                {isBotPoliceThinking && !isOnlineRoom
                  ? `দারোগা ${policePlayer.name} ${TARGET_LABEL[targetRoleToCatch]} খুঁজছেন... চোখে চোখ রাখুন!`
                  : policePlayer.isOnline === false
                  ? `দারোগা ${policePlayer.name} অফলাইন — একটু পরে আপনা-আপনি ধরা হবে`
                  : `দারোগা ${policePlayer.name} সন্দেহভাজনদের পরখ করছেন...`}
              </span>
            </div>
          )}
        </div>
      )}

      {isResolved && accused && (
        <div className="space-y-2.5 anim-pop" aria-live="polite">
          <div className="flex items-center justify-center gap-1.5 font-bold text-base">
            {isCorrectGuess ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-5 h-5" aria-hidden /> সঠিক অনুমান! অপরাধী ধরা পড়েছে!
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1">
                <XCircle className="w-5 h-5" aria-hidden /> ভুল অনুমান! আসল অপরাধী পালিয়েছে!
              </span>
            )}
          </div>

          <div className="text-sm text-amber-200 leading-snug font-bangla-hand">
            {wasAutoAccused && <div className="text-amber-400 font-bold">⏰ সময় শেষ! আপনা-আপনি অভিযোগ করা হয়েছে।</div>}
            দারোগা {policePlayer.name} {TARGET_LABEL[targetRoleToCatch]} খুঁজতে গিয়ে {accused.name}-কে ধরলেন —{' '}
            {accused.role !== 'hidden' && `${accused.name} আসলে ${ROLE_DEFINITIONS[accused.role].nameBn}।`}
            <br />
            {isCorrectGuess ? 'পুলিশ পেলেন ৫০০, ধৃত অপরাধী ০।' : 'পুলিশ পেলেন ০, অপরাধীদের পয়েন্ট সুরক্ষিত।'}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenScoreKhata}
              className="py-2 px-3 bg-amber-900/90 hover:bg-amber-800 text-amber-200 border border-amber-600 rounded-xl text-sm font-bold transition-colors"
            >
              খাতা দেখুন 📓
            </button>
            <button
              type="button"
              onClick={onNextRound}
              autoFocus
              className="py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all inline-flex items-center gap-1.5"
            >
              {isLastRound ? 'চূড়ান্ত ফলাফল দেখুন' : 'পরবর্তী রাউন্ড'}
              {nextSecs !== undefined && <span className="font-bold opacity-80">({toBn(nextSecs)})</span>}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
          {nextSecs !== undefined && (
            <div className="text-xs text-amber-300/80">
              {isLastRound ? 'ফলাফল' : 'পরবর্তী রাউন্ড'} আপনা-আপনি শুরু হবে {toBn(nextSecs)} সেকেন্ডে
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section
      aria-label="খেলার টেবিল"
      className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border-4 border-amber-950 shadow-2xl bg-amber-950 anim-fade"
    >
      <div
        className="relative p-3 sm:p-6 bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${benchUrl})` }}
      >
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <div className="px-3 py-1 bg-black/80 border border-amber-600/60 rounded-lg text-sm text-amber-300 font-bold">
            রাউন্ড {toBn(currentRound)} / {toBn(totalRounds)}
          </div>
          <div className="hidden sm:block px-3 py-1 bg-black/80 border border-amber-600/60 rounded-lg text-sm font-bangla-hand text-amber-200 truncate max-w-[16rem]">
            {isPassAndPlay ? 'পাস অ্যান্ড প্লে · ৪ বন্ধু' : isOnlineRoom ? `🌐 ${roomName ?? 'অনলাইন রুম'}` : '১ জন + ৩ জন বট'}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenScoreKhata}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-600 border border-blue-400/60 rounded-lg text-sm text-white font-bold flex items-center gap-1.5 transition-colors"
            >
              <NotebookPen className="w-4 h-4" aria-hidden />
              খাতা
            </button>
            {onLeave && (
              <button
                type="button"
                onClick={onLeave}
                aria-label="রুম ছাড়ুন"
                title="রুম ছাড়ুন"
                className="p-1.5 bg-black/80 hover:bg-rose-900 border border-rose-500/60 rounded-lg text-rose-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
          {renderSeat(topPlayer, 'top')}
          {renderSeat(leftPlayer, 'left')}
          {centerPanel}
          {renderSeat(rightPlayer, 'right')}
          {renderSeat(bottomPlayer, 'bottom')}
        </div>

        {isOnlineRoom && onReact && <ReactionBar onReact={onReact} />}
      </div>
    </section>
  );
};

const Countdown: React.FC<{ seconds: number; total: number; label: string; urgent: boolean }> = ({
  seconds,
  total,
  label,
  urgent,
}) => (
  <div className="mb-3" role="timer" aria-label={`${label}: ${seconds} সেকেন্ড`}>
    <div className={`flex items-center justify-center gap-1.5 text-sm font-bold mb-1 ${urgent ? 'text-rose-300' : 'text-amber-200'}`}>
      <Timer className={`w-4 h-4 ${urgent ? 'animate-pulse' : ''}`} aria-hidden />
      {label}: {toBn(seconds)} সে.
    </div>
    <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-linear ${urgent ? 'bg-rose-500' : 'bg-amber-400'}`}
        style={{ width: `${Math.min(100, (seconds / total) * 100)}%` }}
      />
    </div>
  </div>
);

// Quick emoji / phrase reactions for online rooms (fixed list, no free text)
const ReactionBar: React.FC<{ onReact: (text: string) => void }> = ({ onReact }) => {
  const [coolingDown, setCoolingDown] = useState(false);
  const send = (text: string) => {
    if (coolingDown) return;
    onReact(text);
    setCoolingDown(true);
    setTimeout(() => setCoolingDown(false), REACT_COOLDOWN_MS);
  };
  return (
    <div className="mt-4 p-2 bg-black/70 border border-amber-800/70 rounded-2xl" role="group" aria-label="দ্রুত প্রতিক্রিয়া">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            disabled={coolingDown}
            onClick={() => send(e)}
            className="shrink-0 w-10 h-10 text-2xl rounded-xl hover:bg-white/10 active:scale-90 transition-transform disabled:opacity-50"
            aria-label={`প্রতিক্রিয়া ${e}`}
          >
            {e}
          </button>
        ))}
        <span className="shrink-0 w-px h-6 bg-amber-800 mx-1" aria-hidden />
        {QUICK_PHRASES.map((p) => (
          <button
            key={p}
            type="button"
            disabled={coolingDown}
            onClick={() => send(p)}
            className="shrink-0 px-3 py-1.5 text-sm font-bangla-hand font-bold text-amber-100 bg-amber-900/60 hover:bg-amber-800 border border-amber-700 rounded-full whitespace-nowrap active:scale-95 transition-transform disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};
