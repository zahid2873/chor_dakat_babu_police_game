/**
 * Unified Domain model types for:
 * 1. 90s Nostalgic Paper Chit Game (Raja 1000, Babu 800, Police 500, Dakat 300, Chor 0)
 * 2. Version C Money Mode (৳25 Virtual Taka)
 */

// Roles
export type PlayerRole = 'babu' | 'police' | 'chor' | 'dakat';
export type RoleType = 'raja' | 'babu' | 'police' | 'dakat' | 'chor';

export type GamePhase =
  | 'setup'
  | 'privateReveal'
  | 'publicReveal'
  | 'guessing'
  | 'roundResult'
  | 'finished';

export type ChitGamePhase =
  | 'shuffle'
  | 'unfold'
  | 'rajaDeclaration'
  | 'policeReveal'
  | 'deduction'
  | 'result'
  | 'scoreboard'
  | 'finished';

export type TargetRole = 'chor' | 'dakat';
export type PlayMode = 'vsBots' | 'passAndPlay';
export type GameMode = 'vsBots' | 'passAndPlay' | 'roomCode';

export interface PlayerStats {
  correctGuesses: number;
  wrongGuesses: number;
  timesCaught: number;
  timesEscaped: number;
  totalEarned: number;
  totalPaid: number;
}

export interface Player {
  id: string;
  seatIndex: number;
  displayName: string;
  role: PlayerRole;
  balance: number;
  isBot: boolean;
  avatarColor: string;
  avatarImage: string;
  stats: PlayerStats;
}

export interface PaperPlayer {
  id: string;
  name: string;
  isBot: boolean;
  avatarEmoji: string;
  role: RoleType;
  chitIndex: number;
  hasSeenChit: boolean;
  currentReaction: string;
  currentDialogue?: string;
  scoreHistory: number[];
  totalScore: number;
}

export interface GameConfig {
  startingBalance: number;
  policeReward: number;
  babuFee: number;
  nonCaughtCriminalFee: number;
  targetOrder: 'alternating' | 'policeChoice';
  alternateDistributionEnabled: boolean;
}

export interface Transaction {
  id: string;
  roundNumber: number;
  payerId: string;
  payerName: string;
  recipientId: string;
  recipientName: string;
  amount: number;
  reason: string;
  reasonBn: string;
  timestamp: number;
}

export interface RoundResult {
  roundNumber: number;
  targetRole: TargetRole;
  activePoliceId: string;
  activeBabuId: string;
  policeGuessPlayerId: string;
  actualTargetPlayerId: string;
  correct: boolean;
  transactions: Transaction[];
  balanceSnapshot: Record<string, number>;
  unpaidPenalty?: number;
}

export interface MatchRanking {
  player: Player;
  rank: number;
  finalBalance: number;
  isWinner: boolean;
}

export interface MatchResult {
  matchId: string;
  rankings: MatchRanking[];
  winnerIds: string[];
  totalRounds: number;
  correctGuesses: number;
  wrongGuesses: number;
  totalMoneyTransferred: number;
  history: RoundResult[];
}

export interface RoleDef {
  type: RoleType;
  nameBn: string;
  nameEn: string;
  titleBn: string;
  points: number;
  color: string;
  quoteBn: string;
  dialogues: string[];
}
