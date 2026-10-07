import { useState } from 'react';
import type { GameMode } from './types/game';
import { GameHeader } from './components/GameHeader';
import { NimGameView } from './components/Nim/NimGameView';
import { ChopsticksGameView } from './components/Chopsticks/ChopsticksGameView';
import { Connect4GameView } from './components/Connect4/Connect4GameView';

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameMode>('connect4');

  return (
    <div className="min-h-screen page-atmosphere text-zinc-200 flex flex-col items-center py-10 px-4 sm:px-6 relative selection:bg-rose-500/20 selection:text-rose-200">
      <GameHeader selectedGame={selectedGame} onSelectGame={setSelectedGame} />

      {/* Main Split Layout */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-3 z-10">
        {selectedGame === 'nim' && <NimGameView />}
        {selectedGame === 'chopsticks' && <ChopsticksGameView />}
        {selectedGame === 'connect4' && <Connect4GameView />}
      </main>
    </div>
  );
}