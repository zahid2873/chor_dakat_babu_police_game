// Roles. 'hidden' is what the online server sends for another player's
// still-folded chit (Chor or Dakat) so roles can't be read from the network.
export type RoleType = 'babu' | 'police' | 'dakat' | 'chor';
export type VisibleRole = RoleType | 'hidden';
export type TargetRole = 'chor' | 'dakat';

export type GameMode = 'vsBots' | 'passAndPlay' | 'online';
export type MatchPhase = 'lobby' | 'playing' | 'scoreboard';
export type RoundPhase = 'interrogation' | 'resolved';

export interface PaperPlayer {
  id: string;
  name: string;
  isBot: boolean;
  avatarEmoji: string;
  role: VisibleRole;
  currentDialogue?: string;
  scoreHistory: number[];
  totalScore: number;
  /** Online rooms only: false when the player stopped polling */
  isOnline?: boolean;
}

export interface RoomReaction {
  id: string;
  playerId: string;
  text: string;
  at: number;
}

export interface RoleDef {
  type: RoleType;
  nameBn: string;
  titleBn: string;
  emoji: string;
  points: number;
  dialogues: string[];
}
