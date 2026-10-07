import type { C4BoardState } from '../types/game';

// Standard Connect 4 grid dimensions
export const C4_ROWS = 6;
export const C4_COLS = 7;

// Center-first column search order to optimize alpha-beta pruning
const COL_ORDER = [3, 2, 4, 1, 5, 0, 6] as const;

// Heuristic column positional weights favoring the center
const WEIGHTS = [1, 2, 4, 7, 4, 2, 1] as const;

// Creates a fresh 6x7 board initialized with nulls
export function createEmptyBoard(): C4BoardState {
  return Array.from({ length: C4_ROWS }, () => Array(C4_COLS).fill(null));
}

// Simulates gravity: finds the lowest available row in a column (-1 if full)
export function getLowestEmptyRow(board: C4BoardState, col: number): number {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

// Drops a disc into a column and returns an immutable new board state
export function dropDisc(board: C4BoardState, col: number, player: 'R' | 'Y') {
  const row = getLowestEmptyRow(board, col);
  if (row === -1) return null; // Column is full
  const newBoard = board.map((r) => [...r]);
  newBoard[row][col] = player;
  return { board: newBoard, row };
}

// Checks for 4-in-a-row (horizontal, vertical, diagonals) or a draw
export function checkConnect4Winner(board: C4BoardState): 'R' | 'Y' | 'DRAW' | null {
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      const p = board[r][c];
      if (!p) continue;
      // Horizontal (→), Vertical (↓), Diagonal (↘), Diagonal (↗)
      if (c + 3 < C4_COLS && p === board[r][c + 1] && p === board[r][c + 2] && p === board[r][c + 3]) return p;
      if (r + 3 < C4_ROWS && p === board[r + 1][c] && p === board[r + 2][c] && p === board[r + 3][c]) return p;
      if (r + 3 < C4_ROWS && c + 3 < C4_COLS && p === board[r + 1][c + 1] && p === board[r + 2][c + 2] && p === board[r + 3][c + 3]) return p;
      if (r - 3 >= 0 && c + 3 < C4_COLS && p === board[r - 1][c + 1] && p === board[r - 2][c + 2] && p === board[r - 3][c + 3]) return p;
    }
  }
  // Check if top row is completely filled (draw)
  return board[0].every((cell) => cell !== null) ? 'DRAW' : null;
}

// Mirrors a 1-indexed column move sequence across the vertical axis (e.g., 1 <-> 7)
function mirrorColumn1Indexed(colStr: string): string {
  return colStr.replace(/[1-7]/g, (c) => String(8 - Number(c)));
}

// Horizontally flips a 2D diagram string array for symmetric positions
function mirrorDiagram(diagram: string[]): string[] {
  return diagram.map((row) => row.split('').reverse().join(''));
}

// Opening book lookups (1-indexed move history -> recommended 1-indexed response)
const WEAKC4_BRANCHES: Record<string, string> = {
  "": "4",
  "41": "5", "42": "4", "43": "4", "44": "4", "45": "4", "46": "4", "47": "3",
  "4151": "5", "4152": "4", "4153": "5", "4154": "4", "4155": "4", "4156": "4", "4157": "4",
  "4241": "4", "4242": "4", "4243": "4", "4244": "2", "4245": "4", "4246": "4", "4247": "4",
  "4341": "4", "4342": "3", "4343": "4", "4344": "3", "4345": "4", "4346": "4", "4347": "4",
  "4441": "4", "4442": "4", "4443": "3", "4444": "4", "4445": "5", "4446": "4", "4447": "4",
};

// Strategic overlay diagrams encoding priority cell levels
const CANONICAL_STEADY_STATE = [
  "3335333", "3333333", "3316263", "3206233", "1Y40RY5", "YY2RRRY",
];

const WEAKC4_STEADY_STATES: Record<string, string[]> = {
  "42442": ["2226222", "2222222", "2226262", "2246232", "Y240R15", "Y2YRRRY"],
  "43443": CANONICAL_STEADY_STATE,
  "43464": CANONICAL_STEADY_STATE,
  "45424": ["3335333", "3333333", "3626133", "3326023", "5YR04Y1", "YRRR2YY"],
};

// Selects the matching strategic diagram based on move history and symmetry
export function getSteadyStateDiagram(history: string): string[] | null {
  for (const [k, diag] of Object.entries(WEAKC4_STEADY_STATES)) {
    if (history.startsWith(k)) return diag;
  }
  const mirrored = mirrorColumn1Indexed(history);
  for (const [k, diag] of Object.entries(WEAKC4_STEADY_STATES)) {
    if (mirrored.startsWith(k)) return mirrorDiagram(diag);
  }
  return history.length >= 5 ? CANONICAL_STEADY_STATE : null;
}

// Static evaluation based on column weights (positive for R, negative for Y)
function evaluateBoard(board: C4BoardState): number {
  let score = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (board[r][c] === 'R') score += WEIGHTS[c];
      else if (board[r][c] === 'Y') score -= WEIGHTS[c];
    }
  }
  return score;
}

// Alpha-beta minimax search
function minimax(board: C4BoardState, depth: number, alpha: number, beta: number, isMax: boolean): number {
  const winner = checkConnect4Winner(board);
  if (winner === 'R') return 100000 + depth;
  if (winner === 'Y') return -100000 - depth;
  if (winner === 'DRAW' || depth === 0) return evaluateBoard(board);

  let best = isMax ? -Infinity : Infinity;
  const p = isMax ? 'R' : 'Y';

  for (const c of COL_ORDER) {
    const r = getLowestEmptyRow(board, c);
    if (r === -1) continue;
    board[r][c] = p;
    const ev = minimax(board, depth - 1, alpha, beta, !isMax);
    board[r][c] = null; // Backtrack
    if (isMax) {
      best = Math.max(best, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    } else {
      best = Math.min(best, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
  }
  return best;
}

// Checks if a player has an immediate 1-move win or block available
function find1PlyMove(board: C4BoardState, p: 'R' | 'Y'): number {
  for (let c = 0; c < C4_COLS; c++) {
    const r = getLowestEmptyRow(board, c);
    if (r === -1) continue;
    board[r][c] = p;
    const won = checkConnect4Winner(board) === p;
    board[r][c] = null;
    if (won) return c;
  }
  return -1;
}

// Tactical engine: checks immediate wins/blocks, then runs a 5-ply minimax
function findTacticalMove(board: C4BoardState): number {
  const win = find1PlyMove(board, 'R');
  if (win !== -1) return win;
  const block = find1PlyMove(board, 'Y');
  if (block !== -1) return block;

  let bestScore = -Infinity, bestCol = 3;
  for (const c of COL_ORDER) {
    const r = getLowestEmptyRow(board, c);
    if (r === -1) continue;
    board[r][c] = 'R';
    const score = minimax(board, 5, -Infinity, Infinity, false);
    board[r][c] = null;
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return bestCol;
}

// Evaluates moves following steady-state priority tiers (0-9, a-d), verified by shallow minimax
function evaluateSteadyStateMove(board: C4BoardState, diagram: string[]) {
  const win = find1PlyMove(board, 'R');
  if (win !== -1) return { col: win, levelMatched: 'WIN' };
  const block = find1PlyMove(board, 'Y');
  if (block !== -1) return { col: block, levelMatched: 'BLOCK' };

  // Iterate through priority characters in ascending order
  for (const lvl of '0123456789abcd') {
    for (const c of COL_ORDER) {
      const r = getLowestEmptyRow(board, c);
      if (r !== -1 && diagram[r][c] === lvl) {
        board[r][c] = 'R';
        const evalScore = minimax(board, 4, -Infinity, Infinity, false);
        board[r][c] = null;
        // Accept move if it doesn't lead to a near-immediate forced loss
        if (evalScore > -50000) return { col: c, levelMatched: lvl };
      }
    }
  }
  return null;
}

// Primary move selector: Opening book -> Steady-state diagram -> Tactical minimax fallback
export function getBestConnect4Move(history: string, board: C4BoardState) {
  // 1. Direct opening book lookup
  if (WEAKC4_BRANCHES[history]) {
    return { col: parseInt(WEAKC4_BRANCHES[history], 10) - 1, source: 'branch' as const, detail: 'Trunk Invariant' };
  }
  // 2. Symmetric opening book lookup
  const mirroredHist = mirrorColumn1Indexed(history);
  if (WEAKC4_BRANCHES[mirroredHist]) {
    return { col: 7 - parseInt(WEAKC4_BRANCHES[mirroredHist], 10), source: 'branch' as const, detail: 'Symmetric Trunk Invariant' };
  }
  // 3. Steady-state diagram evaluation
  const diagram = getSteadyStateDiagram(history);
  if (diagram) {
    const res = evaluateSteadyStateMove(board, diagram);
    if (res) return { col: res.col, source: 'steady_state' as const, detail: `Priority Level [${res.levelMatched}]`, diagram };
  }
  // 4. Tactical minimax fallback
  return {
    col: findTacticalMove(board),
    source: 'tactical' as const,
    detail: 'Tactical Proof Engine',
    diagram: diagram || CANONICAL_STEADY_STATE,
  };
}

export function getConnect4MovesToLoss(
  history: string,
  board: C4BoardState
): { min: number; max: number } {
  const winner = checkConnect4Winner(board);
  if (winner) return { min: 0, max: 0 };

  // If it's currently AI's turn (even history length), simulate AI's response first
  if (history.length % 2 === 0) {
    const aiDecision = getBestConnect4Move(history, board);
    if (aiDecision) {
      const aiDrop = dropDisc(board, aiDecision.col, 'R');
      if (aiDrop) {
        return getConnect4MovesToLoss(history + (aiDecision.col + 1), aiDrop.board);
      }
    }
  }

  // Count empty spaces to determine the upper bound on Yellow turns
  let emptyCells = 0;
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (board[r][c] === null) emptyCells++;
    }
  }

  // Yellow can make at most floor(emptyCells / 2) moves before board fill
  const maxPossible = Math.max(1, Math.floor(emptyCells / 2));

  // Tactical check: Does every possible human move allow Red to win on the next ply?
  let minMoves = Infinity;
  let allWinIn1 = true;
  let legalMoves = 0;

  for (let c = 0; c < C4_COLS; c++) {
    const humanDrop = dropDisc(board, c, 'Y');
    if (!humanDrop) continue;
    legalMoves++;

    if (checkConnect4Winner(humanDrop.board) === 'Y') {
      return { min: 0, max: 0 };
    }

    const redWinCol = find1PlyMove(humanDrop.board, 'R');
    if (redWinCol !== -1) {
      minMoves = Math.min(minMoves, 1);
    } else {
      allWinIn1 = false;
    }
  }

  if (legalMoves === 0) return { min: 0, max: 0 };

  // If every single move Yellow can make allows Red to connect 4 on the next ply
  if (allWinIn1) {
    return { min: 1, max: 1 };
  }

  return {
    min: minMoves === Infinity ? 1 : minMoves,
    max: maxPossible,
  };
}