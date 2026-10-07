import { useState, useMemo } from 'react';
import { RotateCcw, User, Bot, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ChopsticksBoard } from './ChopsticksBoard';
import { ChopsticksTreeVisualizer } from './ChopsticksTreeVisualizer';
import {
  applyChopsticksMove,
  getBestChopsticksMove,
  getChopsticksMovesToLoss,
  isDead,
} from '../../solvers/chopsticks';
import type { ChopsticksState, ChopsticksMove, GameWinner } from '../../types/game';

const INITIAL_STATE: ChopsticksState = {
  p1: [1, 1],
  p2: [1, 1],
};

export function ChopsticksGameView() {
  const [state, setState] = useState<ChopsticksState>(INITIAL_STATE);
  const [ply, setPly] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<GameWinner>(null);
  const [logs, setLogs] = useState<string[]>([
    'Game initialized: [1, 1] vs [1, 1].',
    'Starter: You (Player 1).',
  ]);

  const movesRemaining = useMemo(
    () => getChopsticksMovesToLoss(state, 'P2', isAiThinking ? 'P2' : 'P1'),
    [state, isAiThinking]
  );
  const maxMoves = movesRemaining.max;
  const movesText = maxMoves <= 1 ? '1 move' : `${maxMoves} or fewer moves`;

  const startNewGame = () => {
    setWinner(null);
    setState(INITIAL_STATE);
    setPly(0);
    setIsAiThinking(false);
    setLogs([
      'Game reset to [1, 1] vs [1, 1]. Starter: You (Player 1).',
      'Select an active hand to strike AI.',
    ]);
  };

  const handlePlayerAttack = (move: ChopsticksMove) => {
    if (isAiThinking || winner) return;

    const from = move.fromHand === 0 ? 'L' : 'R';
    const to = move.toHand === 0 ? 'L' : 'R';

    const afterHuman = applyChopsticksMove(state, move, 'P1');
    const targetFingers = afterHuman.p2[move.toHand];
    setState(afterHuman);
    setPly((p) => p + 1);
    setLogs((prev) => [
      ...prev,
      `You (${from}) strike AI (${to}) → hand is now ${targetFingers === 0 ? '0 (FIST)' : targetFingers}.`,
    ]);

    const isGameOverAfterHuman = isDead(afterHuman.p2);
    if (isGameOverAfterHuman) {
      setWinner('Player');
      setLogs((prev) => [...prev, 'AI has no active hands left. Player wins!']);
      return;
    }

    setIsAiThinking(true);
    setTimeout(() => {
      const aiMove = getBestChopsticksMove(afterHuman, 'P2');
      if (aiMove) {
        const afterAi = applyChopsticksMove(afterHuman, aiMove, 'P2');
        const aiFrom = aiMove.fromHand === 0 ? 'L' : 'R';
        const aiTo = aiMove.toHand === 0 ? 'L' : 'R';
        const aiTargetFingers = afterAi.p1[aiMove.toHand];

        setState(afterAi);
        setPly((p) => p + 1);
        setLogs((prev) => [
          ...prev,
          `AI (${aiFrom}) strikes You (${aiTo}) → hand is now ${aiTargetFingers === 0 ? '0 (FIST)' : aiTargetFingers}.`,
        ]);

        const isGameOverAfterAi = isDead(afterAi.p1);
        if (isGameOverAfterAi) {
          setWinner('AI');
          setLogs((prev) => [
            ...prev,
            'You have no active hands left. AI wins as predicted by Weak Tree!',
          ]);
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
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-mono text-zinc-300 font-medium">
                Starter: You (Player 1)
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

          {/* Hands Board */}
          <ChopsticksBoard
            aiHands={state.p2}
            playerHands={state.p1}
            isPlayerTurn={!isAiThinking && !winner}
            onPlayerAttack={handlePlayerAttack}
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
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-mono text-zinc-200 font-bold tracking-wide">
                {winner === 'Player' ? 'PLAYER WINS!' : 'AI WINS (Weak Tree Invariant Held)'}
              </span>
            </div>
          )}

          {/* Turn Status */}
          <div className="text-center mt-1 mb-2 min-h-[22px] flex items-center justify-center">
            {isAiThinking ? (
              <span className="text-xs font-mono text-amber-300 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 animate-spin" />
                AI calculating counter-strike...
              </span>
            ) : (
              !winner && (
                <span className="text-zinc-400 text-xs font-mono">
                  Your turn: select an active hand to attack AI
                </span>
              )
            )}
          </div>

          {/* Tactical Log */}
          <div className="mt-3 pt-3 border-t border-zinc-800/80">
            <div className="bg-[#090b0e] border border-zinc-800/90 rounded-xl p-3 font-mono text-[11px] text-zinc-400 space-y-1.5 max-h-24 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500/80 select-none">↳</span>
                  <span className="text-zinc-300 leading-tight">{log}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explanatory Caption */}
        <p className="mt-4 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800/80 pt-3">
          This is an invariant-preserving weak solution of Chopsticks. Under the AI&apos;s deterministic counter-strategy, every player branch collapses into a forced knockout in 4 rounds or fewer.
        </p>
      </div>

      {/* Right Column: Visualizer */}
      <div className="lg:col-span-7 h-full flex flex-col">
        <ChopsticksTreeVisualizer currentState={state} currentPly={ply} />
      </div>
    </>
  );
}