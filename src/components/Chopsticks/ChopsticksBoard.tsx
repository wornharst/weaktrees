import { useState, useEffect } from 'react';
import { Swords, ShieldAlert } from 'lucide-react';
import type { Hands, ChopsticksMove } from '../../types/game';

interface ChopsticksBoardProps {
  aiHands: Hands;
  playerHands: Hands;
  isPlayerTurn: boolean;
  onPlayerAttack: (move: ChopsticksMove) => void;
}

export function ChopsticksBoard({
  aiHands,
  playerHands,
  isPlayerTurn,
  onPlayerAttack,
}: ChopsticksBoardProps) {
  const [selectedHand, setSelectedHand] = useState<0 | 1 | null>(null);

  // Clear selection if turn ends or active hand is eliminated
  useEffect(() => {
    if (!isPlayerTurn) {
      setSelectedHand(null);
    }
  }, [isPlayerTurn]);

  useEffect(() => {
    if (selectedHand !== null && playerHands[selectedHand] === 0) {
      setSelectedHand(null);
    }
  }, [playerHands, selectedHand]);

  const handleSelectAttacker = (handIdx: 0 | 1) => {
    if (!isPlayerTurn || playerHands[handIdx] === 0) return;
    // Toggle or select attacker hand
    setSelectedHand(handIdx === selectedHand ? null : handIdx);
  };

  const handleTargetStrike = (targetHandIdx: 0 | 1) => {
    if (!isPlayerTurn || selectedHand === null || aiHands[targetHandIdx] === 0) return;
    onPlayerAttack({
      fromHand: selectedHand,
      toHand: targetHandIdx,
    });
    setSelectedHand(null);
  };

  return (
    <div className="my-4 flex flex-col items-center justify-center gap-4 rounded-2xl bg-emerald-950/30 p-4 border border-emerald-500/20 backdrop-blur-sm shadow-inner w-full">
      {/* AI Side (Top Target) */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-rose-400/90">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>AI Hands (Target)</span>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {[0, 1].map((idx) => {
            const count = aiHands[idx];
            const isTargetable = isPlayerTurn && selectedHand !== null && count > 0;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isTargetable}
                onClick={() => handleTargetStrike(idx as 0 | 1)}
                className={`relative flex flex-col items-center justify-center min-h-[96px] p-3 rounded-xl border transition-all duration-200 outline-none ${
                  count === 0
                    ? 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed'
                    : isTargetable
                    ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:scale-102 cursor-pointer hover:border-rose-400'
                    : 'bg-black/50 border-rose-500/20 cursor-default'
                }`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  {idx === 0 ? 'Left Hand' : 'Right Hand'}
                </span>

                {count === 0 ? (
                  <span className="text-xs font-mono text-slate-500 italic"> Eliminated </span>
                ) : (
                  <div className="flex items-center gap-1.5 my-1">
                    {Array.from({ length: 4 }).map((_, fIdx) => (
                      <div
                        key={fIdx}
                        className={`w-3.5 h-8 rounded-full transition-all duration-200 border-t ${
                          fIdx < count
                            ? 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.8)] border-rose-200'
                            : 'bg-slate-800/40 border-slate-700/30'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <span className="text-xs font-mono text-rose-300 font-bold mt-1">
                  {count} {count === 1 ? 'finger' : 'fingers'}
                </span>

                {isTargetable && (
                  <span className="absolute -bottom-2.5 bg-rose-500 text-black text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full shadow">
                    Tap to Strike
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Indicator */}
      <div className="flex items-center gap-3 w-full my-0.5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-800">
          <Swords className="w-3 h-3 text-sky-400" />
          <span>Cutoff ≥ 5 Dies</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      {/* Your Side (Bottom Attacker) */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400/90">
            Your Hands (Attacker)
          </span>
          {selectedHand !== null && (
            <span className="text-[10px] font-mono text-amber-300 animate-pulse">
              Selected {selectedHand === 0 ? 'Left' : 'Right'} Hand → Choose Target Above
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
          {[0, 1].map((idx) => {
            const count = playerHands[idx];
            const isSelected = selectedHand === idx;
            const isSelectable = isPlayerTurn && count > 0;

            return (
              <button
                key={idx}
                type="button"
                disabled={!isSelectable}
                onClick={() => handleSelectAttacker(idx as 0 | 1)}
                className={`relative flex flex-col items-center justify-center min-h-[96px] p-3 rounded-xl border transition-all duration-200 outline-none ${
                  count === 0
                    ? 'bg-black/40 border-slate-800 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'bg-sky-950/60 border-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.4)] -translate-y-1'
                    : isSelectable
                    ? 'bg-black/50 border-sky-500/20 hover:border-sky-400/60 hover:-translate-y-0.5 cursor-pointer'
                    : 'bg-black/50 border-sky-500/10 cursor-not-allowed'
                }`}
              >
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">
                  {idx === 0 ? 'Left Hand' : 'Right Hand'}
                </span>

                {count === 0 ? (
                  <span className="text-xs font-mono text-slate-500 italic"> Eliminated </span>
                ) : (
                  <div className="flex items-center gap-1.5 my-1">
                    {Array.from({ length: 4 }).map((_, fIdx) => (
                      <div
                        key={fIdx}
                        className={`w-3.5 h-8 rounded-full transition-all duration-200 border-t ${
                          fIdx < count
                            ? 'bg-gradient-to-b from-sky-400 to-sky-600 shadow-[0_0_8px_rgba(56,189,248,0.8)] border-sky-200'
                            : 'bg-slate-800/40 border-slate-700/30'
                        }`}
                      />
                    ))}
                  </div>
                )}

                <span className="text-xs font-mono text-sky-300 font-bold mt-1">
                  {count} {count === 1 ? 'finger' : 'fingers'}
                </span>

                {isSelected && (
                  <span className="absolute -top-2.5 bg-sky-400 text-black text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full shadow">
                    Active Attacker
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}