// --- Core Weak Solution Tree Architecture ---
export type Player = "P1" | "P2"; // P1 is AI, P2 is Human

export interface GameNode {
  id: string;
  stateRepresentation: string;
  turn: Player;
  isTerminal: boolean;
  winner?: Player | "DRAW";
  children: {
    moveDescription: string;
    nextNode: GameNode;
  }[];
  steadyStateMatrix?: string;
}

// --- App Shell & UI Types ---
export type GameMode = 'nim' | 'chopsticks' | 'connect4';
export type GameWinner = 'AI' | 'Player' | null;

// --- Game 1: Nim Types ---
export interface NimMove {
  heapIdx: number;
  take: number;
}

export interface NimHoveredMove {
  heapIdx: number;
  count: number;
}

// --- Game 2: Chopsticks Types ---
export type Hands = [number, number];

export interface ChopsticksState {
  p1: Hands;
  p2: Hands;
}

export interface ChopsticksMove {
  fromHand: 0 | 1;
  toHand: 0 | 1;
}

// --- Game 3: Connect 4 Types ---
type C4Cell = 'R' | 'Y' | null;
export type C4BoardState = C4Cell[][];

export interface C4HoveredMove {
  col: number;
}