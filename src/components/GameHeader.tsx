import { Flame, Pointer, CircleDot } from 'lucide-react';
import type { GameMode } from '../types/game';

interface GameHeaderProps {
  selectedGame: GameMode;
  onSelectGame: (game: GameMode) => void;
}

export function GameHeader({ selectedGame, onSelectGame }: GameHeaderProps) {
  const games: {
    id: GameMode;
    label: string;
    badge: string;
    icon: typeof Flame;
    activeStyle: string;
    badgeStyle: string;
    iconColor: string;
  }[] = [
    {
      id: 'nim',
      label: 'Nim',
      badge: '3-4-5',
      icon: Flame,
      activeStyle: 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-[inset_0_1px_0_rgba(251,191,36,0.2)]',
      badgeStyle: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      iconColor: 'text-amber-400',
    },
    {
      id: 'chopsticks',
      label: 'Chopsticks',
      badge: 'Cutoff',
      icon: Pointer,
      activeStyle: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-[inset_0_1px_0_rgba(52,211,153,0.2)]',
      badgeStyle: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'connect4',
      label: 'Connect 4',
      badge: 'WeakC4',
      icon: CircleDot,
      activeStyle: 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-[inset_0_1px_0_rgba(251,113,133,0.2)]',
      badgeStyle: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <header className="text-center mb-8 max-w-3xl flex flex-col items-center">
      {/* Category Pill with a living pulse indicator */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono tracking-wider text-zinc-400 uppercase mb-4 shadow-sm backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        State Space Compression &amp; Weak Solutions
      </div>

      {/* Crafted Metallic Title */}
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 via-zinc-200 to-zinc-400/80 drop-shadow-sm">
        INEVITABLE
      </h1>

      <p className="mt-2.5 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed">
        Interactive demonstration of weak-solvability where the first player forces a win search-free.
      </p>

      {/* Living Tactile Switcher */}
      <div className="mt-6 inline-flex p-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 backdrop-blur-md shadow-lg shadow-black/40 gap-1.5">
        {games.map((game) => {
          const Icon = game.icon;
          const isActive = selectedGame === game.id;
          return (
            <button
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                isActive
                  ? game.activeStyle
                  : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? game.iconColor : 'text-zinc-500'}`} />
              <span>{game.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md transition-colors ${
                  isActive ? game.badgeStyle : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {game.badge}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
}