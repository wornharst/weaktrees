# WeakTrees

An interactive game theory and search tree visualization platform built with React and TypeScript. WeakTrees lets you play classic combinatorial games while simultaneously exploring the underlying decision trees, state-space evaluations, and algorithmic game solvers in real time.

---

## Features

- **Interactive Gameplay**: Play classic zero-sum and combinatorial games directly in the browser.
- **Real-Time Tree Visualizer**: Inspect search trees, state evaluations, and branching decisions as turns unfold.
- **Built-in Solvers**: Algorithmic game-solving engines computing optimal moves and game-theoretic values (win, loss, draw).
- **Modular Component Architecture**: Decoupled game logic, UI board rendering, and tree visualization pipelines.

---

## Supported Games

| Game | Solver Engine | Description |
| :--- | :--- | :--- |
| **Chopsticks** | `solvers/chopsticks.ts` | Hand-gesture combinatorial game modeled as a directed graph (supporting cyclic state handling). |
| **Connect 4** | `solvers/connect4.ts` | Minimax/Alpha-Beta search engine evaluating drop tactics and depth-bounded trees. |
| **Nim** | `solvers/nim.ts` | Classic impartial mathematical game analyzed through Sprague-Grundy theorem & XOR sums (Nim-values). |

---

## Tech Stack

- **Framework**: [React](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/)
- **Styling**: Modern CSS / Modular styling

---

## Project Structure

```text
weaktrees/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Images, icons, and static graphics
│   ├── components/         # Game interfaces and visualization UI
│   │   ├── Chopsticks/
│   │   │   ├── ChopsticksBoard.tsx
│   │   │   ├── ChopsticksGameView.tsx
│   │   │   └── ChopsticksTreeVisualizer.tsx
│   │   ├── Connect4/
│   │   │   ├── Connect4Board.tsx
│   │   │   ├── Connect4GameView.tsx
│   │   └── Nim/
│   │       ├── NimBoard.tsx
│   │       ├── NimGameView.tsx
│   │       └── NimTreeVisualizer.tsx
│   │   └── GameHeader.tsx  # Shared game navigation & status bar
│   ├── solvers/            # Minimax & state-space solving engines
│   │   ├── chopsticks.ts
│   │   ├── connect4.ts
│   │   └── nim.ts
│   ├── types/              # Shared TypeScript definitions
│   │   └── game.ts
│   ├── App.tsx             # Root application component
│   ├── index.css           # Global stylesheet
│   └── main.tsx            # Application entrypoint
├── package.json
└── tsconfig.json
