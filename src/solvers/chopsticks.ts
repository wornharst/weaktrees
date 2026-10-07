import type { ChopsticksState, ChopsticksMove, Hands, Player } from '../types/game';

function toCanonicalStateKey(state: ChopsticksState, turn: Player): string {
  const p1 = state.p1[0] <= state.p1[1] ? `${state.p1[0]},${state.p1[1]}` : `${state.p1[1]},${state.p1[0]}`;
  const p2 = state.p2[0] <= state.p2[1] ? `${state.p2[0]},${state.p2[1]}` : `${state.p2[1]},${state.p2[0]}`;
  return `${p1}|${p2}-${turn}`;
}

export function isDead(hands: Hands): boolean {
  return hands[0] === 0 && hands[1] === 0;
}

export function getLegalChopsticksMoves(attacker: Hands, defender: Hands): ChopsticksMove[] {
  const moves: ChopsticksMove[] = [];
  for (let from = 0; from < 2; from++) {
    if (attacker[from] === 0) continue;
    for (let to = 0; to < 2; to++) {
      if (defender[to] === 0) continue;
      moves.push({ fromHand: from as 0 | 1, toHand: to as 0 | 1 });
    }
  }
  return moves;
}

export function applyChopsticksMove(state: ChopsticksState, move: ChopsticksMove, turn: Player): ChopsticksState {
  const next: ChopsticksState = {
    p1: [state.p1[0], state.p1[1]],
    p2: [state.p2[0], state.p2[1]],
  };

  const target = turn === 'P1' ? next.p2 : next.p1;
  const source = turn === 'P1' ? next.p1 : next.p2;
  const sum = target[move.toHand] + source[move.fromHand];
  target[move.toHand] = sum >= 5 ? 0 : sum;

  return next;
}

interface SolvedOutcome {
  winner: Player;
  pliesToFinish: number;
}

const outcomeMemo = new Map<string, SolvedOutcome>();

function solveChopsticks(state: ChopsticksState, turn: Player): SolvedOutcome {
  if (isDead(state.p1)) return { winner: 'P2', pliesToFinish: 0 };
  if (isDead(state.p2)) return { winner: 'P1', pliesToFinish: 0 };

  const key = toCanonicalStateKey(state, turn);
  if (outcomeMemo.has(key)) return outcomeMemo.get(key)!;

  const attacker = turn === 'P1' ? state.p1 : state.p2;
  const defender = turn === 'P1' ? state.p2 : state.p1;
  const legalMoves = getLegalChopsticksMoves(attacker, defender);
  const opponent: Player = turn === 'P1' ? 'P2' : 'P1';

  if (legalMoves.length === 0) {
    const res: SolvedOutcome = { winner: opponent, pliesToFinish: 0 };
    outcomeMemo.set(key, res);
    return res;
  }

  let canWin = false;
  let minWinPlies = Infinity;
  let longestLossPlies = -1;

  for (const move of legalMoves) {
    const nextState = applyChopsticksMove(state, move, turn);
    const opponentHands = turn === 'P1' ? nextState.p2 : nextState.p1;

    if (isDead(opponentHands)) {
      const outcome: SolvedOutcome = { winner: turn, pliesToFinish: 1 };
      outcomeMemo.set(key, outcome);
      return outcome;
    }

    const child = solveChopsticks(nextState, opponent);
    if (child.winner === turn) {
      canWin = true;
      if (child.pliesToFinish < minWinPlies) minWinPlies = child.pliesToFinish;
    } else if (!canWin && child.pliesToFinish > longestLossPlies) {
      longestLossPlies = child.pliesToFinish;
    }
  }

  const outcome: SolvedOutcome = canWin
    ? { winner: turn, pliesToFinish: minWinPlies + 1 }
    : { winner: opponent, pliesToFinish: longestLossPlies + 1 };

  outcomeMemo.set(key, outcome);
  return outcome;
}

export function getBestChopsticksMove(state: ChopsticksState, aiPlayer: Player = 'P2'): ChopsticksMove | null {
  const attacker = aiPlayer === 'P1' ? state.p1 : state.p2;
  const defender = aiPlayer === 'P1' ? state.p2 : state.p1;
  const legal = getLegalChopsticksMoves(attacker, defender);
  if (legal.length === 0) return null;

  const nextTurn: Player = aiPlayer === 'P1' ? 'P2' : 'P1';

  for (const m of legal) {
    const next = applyChopsticksMove(state, m, aiPlayer);
    const targetDead = isDead(aiPlayer === 'P1' ? next.p2 : next.p1);
    if (targetDead) return m;
  }

  let bestMove = legal[0];
  let minWinPlies = Infinity;
  let longestLossPlies = -1;
  let hasWinningMove = false;

  for (const m of legal) {
    const next = applyChopsticksMove(state, m, aiPlayer);
    const child = solveChopsticks(next, nextTurn);

    if (child.winner === aiPlayer) {
      hasWinningMove = true;
      if (child.pliesToFinish < minWinPlies) {
        minWinPlies = child.pliesToFinish;
        bestMove = m;
      }
    } else if (!hasWinningMove && child.pliesToFinish > longestLossPlies) {
      longestLossPlies = child.pliesToFinish;
      bestMove = m;
    }
  }

  return bestMove;
}

export function getChopsticksMovesToLoss(
  state: ChopsticksState,
  aiPlayer: Player = 'P2',
  currentTurn?: Player
): { min: number; max: number } {
  if (isDead(state.p1) || isDead(state.p2)) return { min: 0, max: 0 };

  const humanPlayer: Player = aiPlayer === 'P1' ? 'P2' : 'P1';
  // Use the active turn if provided; otherwise default to humanPlayer
  const activeTurn = currentTurn ?? humanPlayer;
  let outcome = solveChopsticks(state, activeTurn);

  // Fallback: If AI is not winning from human's perspective, check if it's the AI's turn
  if (outcome.winner !== aiPlayer && !currentTurn) {
    const aiOutcome = solveChopsticks(state, aiPlayer);
    if (aiOutcome.winner === aiPlayer) {
      outcome = aiOutcome;
    }
  }

  if (outcome.winner === aiPlayer) {
    return { min: 1, max: Math.max(1, Math.ceil(outcome.pliesToFinish / 2)) };
  }
  return { min: 0, max: 0 };
}