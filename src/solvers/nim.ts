import type { GameNode, NimMove } from "../types/game";

/**
 * Generates an unbeatable Weak-Solution Tree for Nim.
 * P1 (AI) always plays the single move that forces XOR sum = 0.
 * P2 (Human) branches into every legal move they can possibly make.
 */
function generateNimTree(
  heaps: number[],
  turn: "P1" | "P2"
): GameNode {
  const isGameOver = heaps.every((h) => h === 0);

  // Base Case: Game Over
  if (isGameOver) {
    return {
      id: `terminal-${heaps.join("-")}`,
      stateRepresentation: "All sticks taken! Game Over.",
      turn,
      isTerminal: true,
      // The player whose turn it WOULD be has no moves, so the other player won
      winner: turn === "P1" ? "P2" : "P1",
      children: [],
    };
  }

  const nimSum = heaps.reduce((acc, h) => acc ^ h, 0);
  const stateRep = `Heaps: [${heaps.join(", ")}]`;
  const nodeId = `${heaps.join(",")}-${turn}`;

  // AI Turn (P1): Only pick THE ONE winning move that makes XOR sum == 0
  if (turn === "P1") {
    for (let i = 0; i < heaps.length; i++) {
      const targetSize = heaps[i] ^ nimSum;
      if (targetSize < heaps[i]) {
        const takeCount = heaps[i] - targetSize;
        const nextHeaps = [...heaps];
        nextHeaps[i] = targetSize;

        return {
          id: nodeId,
          stateRepresentation: stateRep,
          turn: "P1",
          isTerminal: false,
          children: [
            {
              moveDescription: `AI takes ${takeCount} from Heap ${i + 1}`,
              nextNode: generateNimTree(nextHeaps, "P2"),
            },
          ],
        };
      }
    }
  }

  // Human Turn (P2): Branch on ALL possible legal moves
  const children: { moveDescription: string; nextNode: GameNode }[] = [];

  for (let i = 0; i < heaps.length; i++) {
    for (let take = 1; take <= heaps[i]; take++) {
      const nextHeaps = [...heaps];
      nextHeaps[i] -= take;

      children.push({
        moveDescription: `You take ${take} from Heap ${i + 1}`,
        nextNode: generateNimTree(nextHeaps, "P1"),
      });
    }
  }

  return {
    id: nodeId,
    stateRepresentation: stateRep,
    turn: "P2",
    isTerminal: false,
    children,
  };
}

/**
 * Calculates the Bouton XOR-sum across all heaps.
 * An XOR-sum of 0 represents a balanced invariant (P-position).
 */
function calculateNimSum(heaps: number[]): number {
  return heaps.reduce((acc, h) => acc ^ h, 0);
}

/**
 * Computes the deterministic invariant-restoring counter-move for live gameplay.
 */
export function getBestNimMove(currentHeaps: number[]): NimMove | null {
  const xorSum = calculateNimSum(currentHeaps);

  if (xorSum === 0) {
    const fallbackIdx = currentHeaps.findIndex((h) => h > 0);
    return fallbackIdx !== -1 ? { heapIdx: fallbackIdx, take: 1 } : null;
  }

  for (let i = 0; i < currentHeaps.length; i++) {
    const targetSize = currentHeaps[i] ^ xorSum;
    if (targetSize < currentHeaps[i]) {
      return { heapIdx: i, take: currentHeaps[i] - targetSize };
    }
  }

  return null;
}

export function getMovesToLoss(heaps: number[]): { min: number; max: number } {
  if (heaps.every((h) => h === 0)) {
    return { min: 0, max: 0 };
  }

  function dfs(currentHeaps: number[], turn: "P1" | "P2"): { min: number; max: number } {
    if (currentHeaps.every((h) => h === 0)) {
      return { min: 0, max: 0 };
    }

    if (turn === "P1") {
      // AI executes its single optimal invariant move
      const aiMove = getBestNimMove(currentHeaps);
      if (!aiMove) return { min: 0, max: 0 };
      const next = [...currentHeaps];
      next[aiMove.heapIdx] -= aiMove.take;
      return dfs(next, "P2");
    } else {
      // Human turn: each branch counts as 1 human move
      let minMoves = Infinity;
      let maxMoves = -Infinity;

      for (let i = 0; i < currentHeaps.length; i++) {
        for (let take = 1; take <= currentHeaps[i]; take++) {
          const next = [...currentHeaps];
          next[i] -= take;
          const sub = dfs(next, "P1");
          minMoves = Math.min(minMoves, 1 + sub.min);
          maxMoves = Math.max(maxMoves, 1 + sub.max);
        }
      }

      if (minMoves === Infinity) return { min: 0, max: 0 };
      return { min: minMoves, max: maxMoves };
    }
  }

  return dfs(heaps, "P2");
}