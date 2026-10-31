import { PaperPlayer, RoleDef, RoleType, TargetRole, VisibleRole } from '../types/game';

// Chor and Dakat share one pool so a suspect's line never gives their role away.
export const SUSPECT_DIALOGUES = [
  'আমি তো সামান্য নিরীহ পথিক, আমাকে সন্দেহ কেন? 😅',
  'চোরের মার বড় গলা, পাশের জনের দিকে তাকান! 👀',
  'আমাকে ধরলে মস্ত ভুল করবেন দারোগা বাবু! 😏',
  'ভাই আমি নিরীহ ছাত্র! জীবনে একটা মাছিও মারিনি! 🥺',
  'দারোগা ভাই, আমার পকেট সার্চ করেন, কিচ্ছু নেই! 🏃‍♂️',
  'আমি তো সকাল থেকে স্কুলে অঙ্ক খাতা লিখছি! 📝',
];

export const ROLE_DEFINITIONS: Record<RoleType, RoleDef> = {
  babu: {
    type: 'babu',
    nameBn: 'বাবু',
    titleBn: 'বাবু মশাই',
    emoji: '👑',
    points: 1000,
    dialogues: [
      'আমি বাবু মশাই! আমার টাকা পয়সা সব সিন্দুকে বন্দি!',
      'দারোগা বাবু! আমার রাজ্যে চোর-ডাকাতের কোনো স্থান নেই!',
      'কে আমার পুলিশ? সামনে এসে আসামীকে সনাক্ত করো!',
    ],
  },
  police: {
    type: 'police',
    nameBn: 'পুলিশ',
    titleBn: 'দারোগা বাবু',
    emoji: '👮',
    points: 500,
    dialogues: [
      'হুজুর, আমি আপনার পুলিশ! এক পলকে চোর-ডাকাত ধরে ফেলব!',
      'কারো চোখের দিকে তাকিয়েই আমি বলে দিতে পারি সে অপরাধী কি না!',
      'কাঁপবেন না! সত্যি কথা বলে ফেলুন!',
    ],
  },
  dakat: {
    type: 'dakat',
    nameBn: 'ডাকাত',
    titleBn: 'ডাকাত সর্দার',
    emoji: '🗡️',
    points: 400,
    dialogues: SUSPECT_DIALOGUES,
  },
  chor: {
    type: 'chor',
    nameBn: 'চোর',
    titleBn: 'সিঁধেল চোর',
    emoji: '🥷',
    points: 100,
    dialogues: SUSPECT_DIALOGUES,
  },
};

export const ROUND_OPTIONS = [3, 5, 10];

// Online quick reactions. Keep in sync with QUICK_REACTIONS in netlify/functions/rooms.ts.
export const QUICK_EMOJIS = ['😂', '😱', '🤫', '👀', '👏', '🙏', '😎', '🤔'];
export const QUICK_PHRASES = ['আমি নির্দোষ!', 'চোর ধরো!', 'দারোগা ভুল করবে!', 'হা হা হা!', 'জলদি করো!', 'সাবাশ!'];

// Bot police picks the right suspect this often.
export const BOT_POLICE_ACCURACY = 0.35;
export const BOT_POLICE_THINK_MS = 2200;

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[+d]);

export const isSuspectRole = (role: VisibleRole) => role !== 'babu' && role !== 'police';

export const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function shuffleRoles(): RoleType[] {
  const roles: RoleType[] = ['babu', 'police', 'dakat', 'chor'];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

// Points for one round. Must match scoreRound() in netlify/functions/rooms.ts.
export function roundPoints(
  role: RoleType,
  isCorrect: boolean,
  isAccused: boolean,
  target: TargetRole
): number {
  if (role === 'babu') return 1000;
  if (role === 'police') return isCorrect ? 500 : 0;
  const caught = isCorrect && isAccused && role === target;
  if (caught) return 0;
  return role === 'dakat' ? 400 : 100;
}

export function topScorers(players: PaperPlayer[]): PaperPlayer[] {
  const max = Math.max(...players.map((p) => p.totalScore));
  return max > 0 ? players.filter((p) => p.totalScore === max) : [];
}
