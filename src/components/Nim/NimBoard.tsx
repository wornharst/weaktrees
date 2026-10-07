import type { NimHoveredMove } from '../../types/game';

interface NimBoardProps {
  heaps: number[];
  disabled: boolean;
  onTake: (heapIdx: number, takeCount: number) => void;
  hoveredMove: NimHoveredMove | null;
  setHoveredMove: (move: NimHoveredMove | null) => void;
}

export function NimBoard({
  heaps,
  disabled,
  onTake,
  hoveredMove,
  setHoveredMove,
}: NimBoardProps) {
  return (
    <div className="my-4 flex flex-col items-center justify-center gap-4 rounded-2xl bg-emerald-950/30 p-4 border border-emerald-500/20 backdrop-blur-sm shadow-inner">
      <div className="flex flex-col items-center gap-3.5 w-full">
        {heaps.map((count, heapIdx) => (
          <div key={heapIdx} className="flex flex-col items-center gap-1 w-full">
            <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/80">
              Heap {heapIdx + 1} ({count} {count === 1 ? 'match' : 'matches'})
            </span>

            <div className="flex items-center justify-center gap-2.5 sm:gap-3 min-h-[64px] px-3 py-2 rounded-xl bg-black/40 border border-emerald-500/10 w-full transition-all">
              {count === 0 ? (
                <span className="text-xs text-slate-500 italic font-mono">Empty</span>
              ) : (
                Array.from({ length: count }).map((_, matchIdx) => {
                  const takeCount = count - matchIdx;
                  const isHovered =
                    hoveredMove?.heapIdx === heapIdx &&
                    matchIdx >= count - hoveredMove.count;

                  return (
                    <button
                      key={matchIdx}
                      type="button"
                      disabled={disabled}
                      onClick={() => onTake(heapIdx, takeCount)}
                      onMouseEnter={() =>
                        !disabled && setHoveredMove({ heapIdx, count: takeCount })
                      }
                      onMouseLeave={() => setHoveredMove(null)}
                      className={`flex flex-col items-center transition-all duration-200 outline-none ${
                        disabled
                          ? 'cursor-not-allowed opacity-70'
                          : 'cursor-pointer hover:brightness-125'
                      } ${isHovered ? '-translate-y-2.5 scale-105' : 'translate-y-0'}`}
                    >
                      <div
                        className={`w-2 h-3 rounded-full transition-all duration-200 ${
                          isHovered
                            ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] border-t border-red-300'
                            : 'bg-red-600 shadow-[0_0_6px_rgba(239,68,68,0.7)] border-t border-red-400'
                        }`}
                      />
                      <div
                        className={`w-1 h-9 rounded-b shadow-sm transition-colors ${
                          isHovered
                            ? 'bg-gradient-to-b from-amber-50 to-amber-200'
                            : 'bg-gradient-to-b from-amber-100 to-amber-200'
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}