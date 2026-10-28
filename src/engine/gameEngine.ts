import {
  Player,
  PlayerRole,
  TargetRole,
  GameConfig,
  Transaction,
  RoundResult,
  MatchRanking,
  PlayMode,
} from '../types/game';
import { translations, Language } from '../utils/i18n';

/**
 * Default Game Configuration adhering to Version C GDD (Goofi rules)
 */
export const DEFAULT_CONFIG: GameConfig = {
  startingBalance: 25,
  policeReward: 2,
  babuFee: 3,
  nonCaughtCriminalFee: 2,
  targetOrder: 'alternating',
  alternateDistributionEnabled: false,
};

/**
 * Creates 4 seats with initial balances and configuration
 */
export function createInitialPlayers(
  mode: PlayMode,
  startingBalance = 25,
  customNames?: string[]
): Player[] {
  const defaultNamesEn = mode === 'vsBots'
    ? ['You (Inspector)', 'Rahim', 'Karim', 'Fatima']
    : ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  const colors = ['#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899'];

  return [0, 1, 2, 3].map((idx) => ({
    id: `p-${idx + 1}`,
    seatIndex: idx,
    displayName: (customNames && customNames[idx]) || defaultNamesEn[idx],
    role: 'babu', // Will be shuffled on deal
    balance: Math.max(1, Math.floor(startingBalance)),
    isBot: mode === 'vsBots' ? idx > 0 : false,
    avatarColor: colors[idx],
    avatarImage: '',
    stats: {
      correctGuesses: 0,
      wrongGuesses: 0,
      timesCaught: 0,
      timesEscaped: 0,
      totalEarned: 0,
      totalPaid: 0,
    },
  }));
}

/**
 * Fisher-Yates shuffle algorithm for fair, unpredictable role distribution
 */
export function shuffleRoles(): PlayerRole[] {
  const roles: PlayerRole[] = ['babu', 'police', 'chor', 'dakat'];
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return roles;
}

/**
 * Deals new secret roles to the four players and sets the target for the round.
 */
export function dealRound(
  roundNumber: number,
  currentPlayers: Player[],
  config: GameConfig
): {
  dealtPlayers: Player[];
  targetRole: TargetRole;
  policePlayerId: string;
  babuPlayerId: string;
  eligibleSuspectIds: string[];
} {
  const shuffled = shuffleRoles();
  const dealtPlayers = currentPlayers.map((player, idx) => ({
    ...player,
    role: shuffled[idx],
  }));

  // Target role determination
  // Default alternating: Round 1 = Chor, Round 2 = Dakat, Round 3 = Chor, etc.
  const targetRole: TargetRole =
    config.targetOrder === 'alternating'
      ? roundNumber % 2 === 1
        ? 'chor'
        : 'dakat'
      : Math.random() < 0.5
      ? 'chor'
      : 'dakat';

  const policePlayer = dealtPlayers.find((p) => p.role === 'police')!;
  const babuPlayer = dealtPlayers.find((p) => p.role === 'babu')!;
  const eligibleSuspects = dealtPlayers
    .filter((p) => p.role === 'chor' || p.role === 'dakat')
    .map((p) => p.id);

  return {
    dealtPlayers,
    targetRole,
    policePlayerId: policePlayer.id,
    babuPlayerId: babuPlayer.id,
    eligibleSuspectIds: eligibleSuspects,
  };
}

/**
 * Executes round settlement with atomic virtual money transactions
 * strictly implementing Section 6 of the GDD:
 * - Correct Guess: Caught player pays ৳2 to Police and ৳3 to Babu
 * - Wrong Guess: Police pays ৳2 to actual target criminal and ৳3 to Babu
 * - Balances are capped at 0 (never negative)
 */
export function settleRound(
  roundNumber: number,
  players: Player[],
  targetRole: TargetRole,
  policeGuessPlayerId: string,
  config: GameConfig,
  lang: Language = 'en'
): {
  roundResult: RoundResult;
  updatedPlayers: Player[];
  isMatchOver: boolean;
} {
  const police = players.find((p) => p.role === 'police')!;
  const babu = players.find((p) => p.role === 'babu')!;
  const guessedPlayer = players.find((p) => p.id === policeGuessPlayerId)!;
  const actualTarget = players.find((p) => p.role === targetRole)!;
  const otherCriminal = players.find(
    (p) => (p.role === 'chor' || p.role === 'dakat') && p.id !== actualTarget.id
  )!;

  const correct = guessedPlayer.id === actualTarget.id;
  const tStrings = translations[lang];

  // Prepare ledger for balance changes
  const balanceChanges: Record<string, number> = {
    [players[0].id]: 0,
    [players[1].id]: 0,
    [players[2].id]: 0,
    [players[3].id]: 0,
  };

  const transactions: Transaction[] = [];
  const now = Date.now();

  if (correct) {
    // Caught player pays ৳2 to Police and ৳3 to Babu
    const payer = guessedPlayer;
    const requiredTotal = config.policeReward + config.babuFee + (config.alternateDistributionEnabled ? config.nonCaughtCriminalFee : 0);
    const available = Math.max(0, payer.balance);
    const payScale = available >= requiredTotal ? 1 : available / Math.max(1, requiredTotal);

    const policePayout = Math.round(config.policeReward * payScale);
    const babuPayout = Math.min(available - policePayout, Math.round(config.babuFee * payScale));

    transactions.push({
      id: `tx-${roundNumber}-1`,
      roundNumber,
      payerId: payer.id,
      payerName: payer.displayName,
      recipientId: police.id,
      recipientName: police.displayName,
      amount: policePayout,
      reason: tStrings.policeRewardReason,
      reasonBn: translations.bn.policeRewardReason,
      timestamp: now,
    });

    transactions.push({
      id: `tx-${roundNumber}-2`,
      roundNumber,
      payerId: payer.id,
      payerName: payer.displayName,
      recipientId: babu.id,
      recipientName: babu.displayName,
      amount: babuPayout,
      reason: tStrings.babuFeeReason,
      reasonBn: translations.bn.babuFeeReason,
      timestamp: now + 50,
    });

    if (config.alternateDistributionEnabled) {
      const otherPayout = Math.min(
        Math.max(0, available - policePayout - babuPayout),
        config.nonCaughtCriminalFee
      );
      if (otherPayout > 0) {
        transactions.push({
          id: `tx-${roundNumber}-3`,
          roundNumber,
          payerId: payer.id,
          payerName: payer.displayName,
          recipientId: otherCriminal.id,
          recipientName: otherCriminal.displayName,
          amount: otherPayout,
          reason: tStrings.alternateInnocentFeeReason,
          reasonBn: translations.bn.alternateInnocentFeeReason,
          timestamp: now + 100,
        });
      }
    }
  } else {
    // Wrong guess: Police pays ৳2 to actual target criminal and ৳3 to Babu
    const payer = police;
    const requiredTotal = config.policeReward + config.babuFee + (config.alternateDistributionEnabled ? config.nonCaughtCriminalFee : 0);
    const available = Math.max(0, payer.balance);
    const payScale = available >= requiredTotal ? 1 : available / Math.max(1, requiredTotal);

    const criminalPayout = Math.round(config.policeReward * payScale);
    const babuPayout = Math.min(available - criminalPayout, Math.round(config.babuFee * payScale));

    transactions.push({
      id: `tx-${roundNumber}-1`,
      roundNumber,
      payerId: payer.id,
      payerName: payer.displayName,
      recipientId: actualTarget.id,
      recipientName: actualTarget.displayName,
      amount: criminalPayout,
      reason: tStrings.wrongGuessPenaltyReason,
      reasonBn: translations.bn.wrongGuessPenaltyReason,
      timestamp: now,
    });

    transactions.push({
      id: `tx-${roundNumber}-2`,
      roundNumber,
      payerId: payer.id,
      payerName: payer.displayName,
      recipientId: babu.id,
      recipientName: babu.displayName,
      amount: babuPayout,
      reason: tStrings.babuFeeReason,
      reasonBn: translations.bn.babuFeeReason,
      timestamp: now + 50,
    });

    if (config.alternateDistributionEnabled) {
      const otherPayout = Math.min(
        Math.max(0, available - criminalPayout - babuPayout),
        config.nonCaughtCriminalFee
      );
      if (otherPayout > 0) {
        transactions.push({
          id: `tx-${roundNumber}-3`,
          roundNumber,
          payerId: payer.id,
          payerName: payer.displayName,
          recipientId: otherCriminal.id,
          recipientName: otherCriminal.displayName,
          amount: otherPayout,
          reason: tStrings.alternateInnocentFeeReason,
          reasonBn: translations.bn.alternateInnocentFeeReason,
          timestamp: now + 100,
        });
      }
    }
  }

  // Apply transactions atomically
  transactions.forEach((tx) => {
    balanceChanges[tx.payerId] = (balanceChanges[tx.payerId] || 0) - tx.amount;
    balanceChanges[tx.recipientId] = (balanceChanges[tx.recipientId] || 0) + tx.amount;
  });

  const updatedPlayers = players.map((p) => {
    const delta = balanceChanges[p.id] || 0;
    const newBalance = Math.max(0, p.balance + delta); // Never negative (cap rule)

    const stats = { ...p.stats };
    if (delta > 0) stats.totalEarned += delta;
    if (delta < 0) stats.totalPaid += Math.abs(delta);

    if (p.id === police.id) {
      if (correct) stats.correctGuesses += 1;
      else stats.wrongGuesses += 1;
    }
    if (p.id === actualTarget.id) {
      if (correct) stats.timesCaught += 1;
      else stats.timesEscaped += 1;
    }

    return {
      ...p,
      balance: newBalance,
      stats,
    };
  });

  const balanceSnapshot = updatedPlayers.reduce((acc, p) => {
    acc[p.id] = p.balance;
    return acc;
  }, {} as Record<string, number>);

  // End condition: Any player runs out of money (balance <= 0)
  const isMatchOver = updatedPlayers.some((p) => p.balance <= 0);

  const roundResult: RoundResult = {
    roundNumber,
    targetRole,
    activePoliceId: police.id,
    activeBabuId: babu.id,
    policeGuessPlayerId,
    actualTargetPlayerId: actualTarget.id,
    correct,
    transactions,
    balanceSnapshot,
  };

  return {
    roundResult,
    updatedPlayers,
    isMatchOver,
  };
}

/**
 * Calculates final rankings and handles shared winners
 */
export function calculateRankings(players: Player[]): MatchRanking[] {
  const sorted = [...players].sort((a, b) => b.balance - a.balance);
  const highestBalance = sorted[0]?.balance ?? 0;

  let currentRank = 1;
  return sorted.map((player, index) => {
    if (index > 0 && player.balance < sorted[index - 1].balance) {
      currentRank = index + 1;
    }
    return {
      player,
      rank: currentRank,
      finalBalance: player.balance,
      isWinner: player.balance === highestBalance,
    };
  });
}
