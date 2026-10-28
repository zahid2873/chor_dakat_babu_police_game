import { RoleDef, RoleType } from '../types/game';

export const ROLE_DEFINITIONS: Record<RoleType, RoleDef> = {
  babu: {
    type: 'babu',
    nameBn: 'বাবু',
    nameEn: 'Babu (Aristocrat)',
    titleBn: 'বাবু মশাই',
    points: 1000,
    color: '#047857', // Emerald
    quoteBn: 'আমি বাবু মশাই! কে আমার পুলিশ?',
    dialogues: [
      'আমি বাবু মশাই! আমার টাকা পয়সা সব সিন্দুকে বন্দি!',
      'দারোগা বাবু! আমার রাজ্যে চোর-ডাকাতের কোনো স্থান নেই!',
      'কে আমার পুলিশ? সামনে এসে আসামীকে সনাক্ত করো!',
    ],
  },
  police: {
    type: 'police',
    nameBn: 'পুলিশ',
    nameEn: 'Police (Inspector)',
    titleBn: 'দারোগা বাবু',
    points: 500,
    color: '#1d4ed8', // Royal Blue ink
    quoteBn: 'হুজুর, আমি আপনার দারোগা! এখনই আসামী ধরছি!',
    dialogues: [
      'হুজুর, আমি আপনার পুলিশ! এক পলকে চোর-ডাকাত ধরে ফেলব!',
      'কারো চোখের দিকে তাকিয়েই আমি বলে দিতে পারি সে অপরাধী কি না!',
      'কাঁপবেন না! সত্যি কথা বলে ফেলুন!',
    ],
  },
  dakat: {
    type: 'dakat',
    nameBn: 'ডাকাত',
    nameEn: 'Dakat (Bandit)',
    titleBn: 'ডাকাত সর্দার',
    points: 400,
    color: '#be123c', // Crimson Red
    quoteBn: 'পুলিশ ভুল করলেই আমার ৪০০ পয়েন্ট নিশ্চিত!',
    dialogues: [
      'আমি তো সামান্য নিরীহ পথিক, ডাকাত কোথায় পেলেন? 😅',
      'চোরের মার বড় গলা, পাশের জনের দিকে তাকান! 👀',
      'আমাকে ডাকাত ভাবলে মস্ত ভুল করবেন দারোগা বাবু! 😏',
    ],
  },
  chor: {
    type: 'chor',
    nameBn: 'চোর',
    nameEn: 'Chor (Thief)',
    titleBn: 'সিঁধেল চোর',
    points: 100,
    color: '#6b21a8', // Purple
    quoteBn: 'পুলিশের চোখ ফাঁকি দিলে ১০০ পয়েন্ট আমার!',
    dialogues: [
      'ভাই আমি নিরীহ ছাত্র! জীবনে একটা মাছিও মারিনি! 🥺',
      'চোরের মার বড় গলা! রহিম ভাইয়ের চোখের দিকে তাকান! 👀',
      'দারোগা ভাই, আমার পকেট সার্চ করেন, কিচ্ছু নেই! 🏃‍♂️',
      'আমি তো সকাল থেকে স্কুলে অঙ্ক খাতা লিখছি! 📝',
    ],
  },
  raja: {
    type: 'raja',
    nameBn: 'রাজা',
    nameEn: 'Raja',
    titleBn: 'মহারাজা',
    points: 1000,
    color: '#b45309',
    quoteBn: 'আমি রাজা! কে আমার পুলিশ?',
    dialogues: ['আমি রাজা! কে আমার পুলিশ?'],
  },
};

export const BLUFF_REACTIONS = [
  { emoji: '😅', text: 'ঘাম মুছে স্বাভাবিক থাকার চেষ্টা...' },
  { emoji: '👀', text: 'চোখ পিটপিট করে আশেপাশে তাকাচ্ছে...' },
  { emoji: '😏', text: 'মুচকি হেসে আত্মবিশ্বাস দেখাচ্ছে...' },
  { emoji: '😨', text: 'দারোগার দিকে তাকিয়ে মৃদু কাঁপছে...' },
  { emoji: '🤔', text: 'গভীর চিন্তায় মগ্ন ভাব দেখাচ্ছে...' },
  { emoji: '😇', text: 'একেবারে সাধু সন্ন্যাসীর মতো নিষ্পাপ মুখ!' },
];
