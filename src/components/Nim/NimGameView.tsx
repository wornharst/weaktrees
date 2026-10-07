import { useState, useMemo } from 'react';
import { RotateCcw, Bot, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { NimBoard } from './NimBoard';
import { NimTreeVisualizer } from './NimTreeVisualizer';
import { getBestNimMove, getMovesToLoss } from '../../solvers/nim';
import type { GameWinner, NimHoveredMove } from '../../types/game';

export function NimGameView() {
  const [heaps, setHeaps] = useState<number[]>([1, 4, 5]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<GameWinner>(null);
  const [hoveredMove, setHoveredMove] = useState<NimHoveredMove | null>(null);
  const [logs, setLogs] = useState<string[]>([
    'Game initialized [3, 4, 5].',
    'AI opening move: takes 2 from Heap 1 (forces Nim-sum: 0)'
  ]);

  const movesRemaining = useMemo(() => getMovesToLoss(heaps), [heaps]);
  const maxMoves = movesRemaining.max;
  const movesText = maxMoves <= 1 ? '1 move' : `${maxMoves} or fewer moves`;

  const startNewGame = () => {
    setWinner(null);
    setHoveredMove(null);
    setHeaps([3, 4, 5]);
    setIsAiThinking(true);
    setLogs([
      'Game reset with [3, 4, 5]. Starter: AI (Player 1).',
      'AI calculating opening move...'
    ]);

    setTimeout(() => {
      setHeaps([1, 4, 5]);
      setLogs((prev) => [
        ...prev,
        'AI takes 2 from Heap 1 (forces Nim-sum: 0)'
      ]);
      setIsAiThinking(false);
    }, 450);
  };

  const handleTakeMatches = (heapIdx: number, takeCount: number) => {
    if (isAiThinking || winner) return;

    setHoveredMove(null);

    const afterHuman = [...heaps];
    afterHuman[heapIdx] -= takeCount;
    setHeaps(afterHuman);

    const isGameOverAfterHuman = afterHuman.every((h) => h === 0);
    setLogs((prev) => [...prev, `You take ${takeCount} from Heap ${heapIdx + 1}`]);

    if (isGameOverAfterHuman) {
      setWinner('Player');
      setLogs((prev) => [...prev, 'You took the last match. Player wins!']);
      return;
    }

    setIsAiThinking(true);
    setTimeout(() => {
      const aiMove = getBestNimMove(afterHuman);
      if (aiMove) {
        const afterAi = [...afterHuman];
        afterAi[aiMove.heapIdx] -= aiMove.take;
        setHeaps(afterAi);

        const isGameOverAfterAi = afterAi.every((h) => h === 0);
        setLogs((prev) => [
          ...prev,
          `AI takes ${aiMove.take} from Heap ${aiMove.heapIdx + 1} (forces Nim-sum: 0)`
        ]);

        if (isGameOverAfterAi) {
          setWinner('AI');
          setLogs((prev) => [...prev, 'AI took the last match. AI wins as predicted by Weak Tree!']);
        }
      }
      setIsAiThinking(false);
    }, 450);
  };

  return (
    <>
      {/* Left Column: Board & Controls */}
      <div className="lg:col-span-5 h-full bg-[#12141a]/95 border border-zinc-800/80 rounded-2xl p-5 shadow-xl shadow-black/40 backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/70 pb-3.5">
            <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono text-zinc-300 font-medium">
                Starter: AI (Player 1)
              </span>
            </div>

            <button
              onClick={startNewGame}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          {/* Matchstick Board */}
          <NimBoard
            heaps={heaps}
            disabled={isAiThinking || winner !== null}
            onTake={handleTakeMatches}
            hoveredMove={hoveredMove}
            setHoveredMove={setHoveredMove}
          />

          {/* Invariant Monitor */}
          {!winner ? (
            <div className="my-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-950/30 via-red-950/20 to-rose-950/30 border border-rose-900/40 flex items-center justify-center gap-2.5 text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-mono font-medium tracking-wide">
                Defeat Inevitable: You will lose in <strong className="text-rose-100 underline decoration-rose-500/50">{movesText}</strong>
              </span>
            </div>
          ) : (
            <div className="my-2.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-mono text-zinc-200 font-bold tracking-wide">
                AI WINS (Weak Solution Invariant Held)
              </span>
            </div>
          )}

          {/* Hover Preview Above Turn Text */}
          <div className="h-5 flex items-center justify-center text-xs font-medium">
            {hoveredMove && !isAiThinking && !winner ? (
              <span className="text-amber-200/90 font-mono text-[11px]">
                Take <strong className="text-white underline decoration-amber-400/60 font-semibold">{hoveredMove.count}</strong> match{hoveredMove.count > 1 ? 'es' : ''} from Heap {hoveredMove.heapIdx + 1}
              </span>
            ) : (
              <span className="text-transparent select-none">-</span>
            )}
          </div>

          {/* Turn Status */}
          <div className="text-center mt-0.5 mb-2 min-h-[22px] flex items-center justify-center">
            {isAiThinking ? (
              <span className="text-xs font-mono text-amber-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 animate-spin" />
                AI calculating Bouton counter-move...
              </span>
            ) : (
              !winner && (
                <span className="text-zinc-400 text-xs font-mono">
                  Your turn: select sticks from any heap
                </span>
              )
            )}
          </div>

          {/* Tactical Log */}
          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <div className="bg-[#090b0e] border border-zinc-800/90 rounded-xl p-3 font-mono text-[11px] text-zinc-400 space-y-1.5 max-h-24 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-500/80 select-none">↳</span>
                  <span className="text-zinc-300 leading-tight">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explanatory Caption */}
        <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800/80 pt-3">
          This is a low-information, search-free weak solution of Nim (3-4-5).
          By enforcing a Bouton XOR-sum of 0 on every response, Player 1 collapses
          the combinatorial explosion down to a single deterministic path per opponent move.
        </p>
      </div>

      {/* Right Column: Visualizer */}
      <div className="lg:col-span-7 h-full flex flex-col">
        <NimTreeVisualizer currentHeaps={heaps} />
      </div>
    </>
  );
}