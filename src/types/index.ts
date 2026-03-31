export type Role = 'super_admin' | 'admin' | 'user';
export type UserStatus = 'online' | 'offline' | 'in_game' | 'challenge_pending';
export type GameStatus = 'waiting' | 'active' | 'finished';
export type RoundWinner = 'p1' | 'p2' | 'tie';

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  status: UserStatus;
  lastSeen: string;
}

export interface GameRoom {
  id: string;
  player1Id: string;
  player2Id: string;
  status: GameStatus;
  createdAt: string;
  player1?: PublicUser;
  player2?: PublicUser;
}

export interface GameRound {
  id: string;
  roomId: string;
  roundNumber: number;
  p1Secret?: number | null;
  p2Secret?: number | null;
  p1Guess?: number | null;
  p2Guess?: number | null;
  winner?: RoundWinner | null;
}

export interface ChallengePayload {
  fromId: string;
  fromUsername: string;
  toId: string;
}

export interface GameStartPayload {
  roomId: string;
  player1: PublicUser;
  player2: PublicUser;
}

export interface SecretLockedPayload {
  roomId: string;
  playerId: string;
}

export interface GuessPayload {
  roomId: string;
  roundId: string;
  playerId: string;
  guess: number;
}

export interface GuessResultPayload {
  roomId: string;
  roundId: string;
  playerId: string;
  guess: number;
  hint: 'correct' | 'higher' | 'lower';
}

export interface RoundResultPayload {
  roomId: string;
  roundNumber: number;
  winner: RoundWinner;
  p1Guess: number;
  p2Guess: number;
  p1Secret: number;
  p2Secret: number;
}

// Next-auth session extension
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    };
  }
  interface User {
    id: string;
    username: string;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}
