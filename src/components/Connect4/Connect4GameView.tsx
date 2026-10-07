import { useState, useMemo } from 'react';
import { RotateCcw, Bot, Layers, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Connect4Board } from './Connect4Board';
import { Connect4TreeVisualizer } from './Connect4TreeVisualizer';
import {
  createEmptyBoard,
  dropDisc,
  checkConnect4Winner,
  getBestConnect4Move,
  getSteadyStateDiagram,
  getConnect4MovesToLoss,
} from '../../solvers/connect4';
import type { C4BoardState, C4HoveredMove, GameWinner } from '../../types/game';

export function Connect4GameView() {
  const [board, setBoard] = useState<C4BoardState>(() => {
    const initial = createEmptyBoard();
    initial[5][3] = 'R';
    return initial;
  });

  const [history, setHistory] = useState<string>('4');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<GameWinner>(null);
  const [hoveredMove, setHoveredMove] = useState<C4HoveredMove | null>(null);
  const [activeDiagram, setActiveDiagram] = useState<string[] | null>(null);
  const [showDiagramOverlay, setShowDiagramOverlay] = useState(true);

  const [logs, setLogs] = useState<string[]>([
    'Game initialized (7x6). Starter: AI (Player 1 Red).',
    'AI opening move: Column 4 (WeakC4 invariant root)',
  ]);

  const movesRemaining = useMemo(
    () => getConnect4MovesToLoss(history, board),
    [history, board]
  );
  const maxMoves = movesRemaining.max;
  const movesText = maxMoves <= 1 ? '1 move' : `${maxMoves} or fewer moves`;

  const startNewGame = () => {
    const initial = createEmptyBoard();
    initial[5][3] = 'R';
    setBoard(initial);
    setHistory('4');
    setWinner(null);
    setHoveredMove(null);
    setActiveDiagram(null);
    setIsAiThinking(false);
    setLogs([
      'Game reset. Starter: AI (Player 1 Red).',
      'AI opening move: Column 4 (WeakC4 invariant root)',
    ]);
  };

  const handleHumanDrop = (col: number) => {
    if (isAiThinking || winner) return;

    setHoveredMove(null);

    const humanResult = dropDisc(board, col, 'Y');
    if (!humanResult) return;

    const newHistory = history + (col + 1).toString();
    setHistory(newHistory);
    setBoard(humanResult.board);
    setLogs((prev) => [...prev, `You dropped Yellow in Column ${col + 1}`]);

    const statusAfterHuman = checkConnect4Winner(humanResult.board);
    if (statusAfterHuman === 'Y') {
      setWinner('Player');
      setLogs((prev) => [...prev, 'Player connected 4!']);
      return;
    } else if (statusAfterHuman === 'DRAW') {
      setWinner('Player');
      setLogs((prev) => [...prev, 'Game drawn.']);
      return;
    }

    setIsAiThinking(true);
    setTimeout(() => {
      const decision = getBestConnect4Move(newHistory, humanResult.board);

      if (decision) {
        const aiResult = dropDisc(humanResult.board, decision.col, 'R');
        if (aiResult) {
          const postAiHistory = newHistory + (decision.col + 1).toString();
          setHistory(postAiHistory);
          setBoard(aiResult.board);

          const diagram = decision.diagram || getSteadyStateDiagram(postAiHistory);
          setActiveDiagram(diagram || null);

          setLogs((prev) => [
            ...prev,
            `AI counter-move: Column ${decision.col + 1} (${decision.detail})`,
          ]);

          const statusAfterAi = checkConnect4Winner(aiResult.board);
          if (statusAfterAi === 'R') {
            setWinner('AI');
            setLogs((prev) => [...prev, 'AI connected 4. AI wins as predicted by WeakC4!']);
          } else if (statusAfterAi === 'DRAW') {
            setWinner('Player');
            setLogs((prev) => [...prev, 'Game drawn.']);
          }
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
              <Bot className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-mono text-zinc-300 font-medium">
                Starter: AI (Player 1 Red)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeDiagram && (
                <button
                  onClick={() => setShowDiagramOverlay(!showDiagramOverlay)}
                  className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                    showDiagramOverlay
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-zinc-900/80 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="Toggle Steady State Priority Grid Overlay"
                >
                  <Layers className="w-3 h-3 text-rose-400" />
                  {showDiagramOverlay ? 'Matrix On' : 'Matrix Off'}
                </button>
              )}

              <button
                onClick={startNewGame}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800/80 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Connect 4 Board */}
          <Connect4Board
            board={board}
            disabled={isAiThinking || winner !== null}
            onDrop={handleHumanDrop}
            hoveredMove={hoveredMove}
            setHoveredMove={setHoveredMove}
            steadyStateMatrix={showDiagramOverlay ? activeDiagram : null}
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
              <CheckCircle2 className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="text-xs font-mono text-zinc-200 font-bold tracking-wide">
                {winner === 'AI' ? 'AI WINS (WeakC4 Solution Maintained)' : 'GAME OVER'}
              </span>
            </div>
          )}

          {/* Hover Preview Above Turn Text */}
          <div className="h-5 flex items-center justify-center text-xs font-medium">
            {hoveredMove && !isAiThinking && !winner ? (
              <span className="text-amber-200/90 font-mono text-[11px]">
                Drop Yellow disc into Column{' '}
                <strong className="text-white underline decoration-amber-400/60 font-semibold">{hoveredMove.col + 1}</strong>
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
                AI computing proof response...
              </span>
            ) : (
              !winner && (
                <span className="text-zinc-400 text-xs font-mono">
                  Your turn: click any column to drop Yellow disc
                </span>
              )
            )}
          </div>

          {/* Tactical Log */}
          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <div className="bg-[#090b0e] border border-zinc-800/90 rounded-xl p-3 font-mono text-[11px] text-zinc-400 space-y-1.5 max-h-24 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-rose-500/80 select-none">↳</span>
                  <span className="text-zinc-300 leading-tight">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explanatory Caption */}
        <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800/80 pt-3">
          Based on 2swap&apos;s WeakC4. By pinning the opening disc to Column 4 and transitioning
          to fixed Steady-State priority diagrams at the leaves, Connect-4 is solved search-free.
        </p>
      </div>

      {/* Right Column: Visualizer */}
      <div className="lg:col-span-7 h-full flex flex-col">
        <Connect4TreeVisualizer currentHistory={history} />
      </div>
    </>
  );
}