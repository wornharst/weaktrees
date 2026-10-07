import type { C4BoardState, C4HoveredMove } from '../../types/game';
import { C4_COLS, C4_ROWS, getLowestEmptyRow } from '../../solvers/connect4';

interface Connect4BoardProps {
  board: C4BoardState;
  disabled: boolean;
  onDrop: (col: number) => void;
  hoveredMove: C4HoveredMove | null;
  setHoveredMove: (move: C4HoveredMove | null) => void;
  steadyStateMatrix?: string[] | null;
}

export function Connect4Board({
  board,
  disabled,
  onDrop,
  hoveredMove,
  setHoveredMove,
  steadyStateMatrix,
}: Connect4BoardProps) {
  return (
    <div className="my-3 flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-950/20 border border-sky-500/20 backdrop-blur-md shadow-inner select-none">
      {/* Drop Arrows */}
      <div className="grid grid-cols-7 gap-2.5 w-full max-w-[390px] mb-2 px-1">
        {Array.from({ length: C4_COLS }).map((_, col) => {
          const isPlayable = getLowestEmptyRow(board, col) !== -1;
          const isHovered = hoveredMove?.col === col && !disabled && isPlayable;

          return (
            <div key={col} className="flex justify-center items-center h-4">
              {isHovered && (
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 animate-bounce" />
              )}
            </div>
          );
        })}
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-7 gap-2.5 bg-blue-950/70 p-3 rounded-2xl border-2 border-blue-600/50 shadow-[0_0_25px_rgba(37,99,235,0.25)] w-full max-w-[390px]">
        {Array.from({ length: C4_COLS }).map((_, col) => {
          const lowestRow = getLowestEmptyRow(board, col);
          const isColFull = lowestRow === -1;

          return (
            <button
              key={col}
              type="button"
              disabled={disabled || isColFull}
              onClick={() => onDrop(col)}
              onMouseEnter={() => !disabled && setHoveredMove({ col })}
              onMouseLeave={() => setHoveredMove(null)}
              className={`flex flex-col gap-2.5 outline-none rounded-xl transition-colors ${
                disabled || isColFull
                  ? 'cursor-not-allowed opacity-80'
                  : 'cursor-pointer hover:bg-sky-400/10'
              }`}
            >
              {Array.from({ length: C4_ROWS }).map((_, row) => {
                const cell = board[row][col];
                const isHoverTarget =
                  hoveredMove?.col === col && row === lowestRow && !disabled;
                const rawChar =
                  steadyStateMatrix && steadyStateMatrix[row]
                    ? steadyStateMatrix[row][col]
                    : null;
                const isPlayableRow = row === lowestRow;

                const displayDigit =
                  !cell && rawChar
                    ? rawChar === 'R' || rawChar === 'Y'
                      ? '9'
                      : rawChar
                    : null;

                return (
                  <div
                    key={row}
                    className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-950 border border-blue-900/60 flex items-center justify-center overflow-hidden shadow-inner"
                  >
                    {/* Settled Disc */}
                    {cell === 'R' && (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-rose-500 to-rose-700 border-2 border-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.9)]" />
                    )}
                    {cell === 'Y' && (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
                    )}

                    {/* Ghost Disc */}
                    {isHoverTarget && !cell && (
                      <div className="w-full h-full rounded-full bg-amber-400/40 border border-amber-300 animate-pulse" />
                    )}

                    {/* Steady State Priority Number */}
                    {displayDigit && (
                      <span
                        className={`text-xs font-mono font-bold pointer-events-none transition-all ${
                          isPlayableRow
                            ? 'text-emerald-400 scale-125 drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                            : 'text-sky-300/80'
                        }`}
                      >
                        {displayDigit}
                      </span>
                    )}
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}