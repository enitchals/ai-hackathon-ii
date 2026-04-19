# Arcade Collection

A collection of browser-based arcade games and productivity tools, built as a single-page app during a hackathon. Everything runs client-side with no backend — just open it and play.

## Games

| | Game | Description |
|---|---|---|
| 🪱 | **Worm** | Guide your worm to eat fruit and grow. Classic snake gameplay with a modern twist. |
| 📼 | **Block Buster** | Break bricks with a bouncing ball. Breakout-style action with power-ups. |
| 🎉 | **Block Party** | Stack falling tetrominoes and clear lines. A Tetris-inspired puzzle game. |
| 👻 | **Pac-Man** | Eat dots, avoid ghosts, and chase high scores in procedurally generated mazes. |
| 🐝 | **Spelling Bee** | Make as many words as you can from 7 letters — but every word must use the center letter. Inspired by the NYT puzzle. |
| 🟩 | **Wordl** | Guess the 5-letter word in 6 tries with color-coded feedback. A Wordle clone with streak tracking. |
| 🏎️ | **Racer** | Dodge obstacles and collect coins in an endless lane-switching road game. Configurable speed and difficulty. |
| 🎲 | **ADHD20** | Roll a virtual D20 to randomly pick your next task from a to-do list. Includes a focus timer and reward system. |

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite 8** — build tooling and dev server
- **MUI v9** — component library and theming
- **React Router v7** — client-side routing
- **Vitest** — unit tests (154+ tests across all games)
- **GitHub Pages** — static hosting via `gh-pages`

## Architecture

- **No backend.** All state lives in `localStorage`, namespaced per game (`arcade:<appId>:<key>`).
- **Pure logic separation.** Each game has a `*Logic.ts` file with pure functions and a `*Logic.test.ts` file with unit tests, fully decoupled from React.
- **Lazy-loaded routes.** Games are registered in `src/registry.ts` and code-split automatically.
- **Mobile-first.** Touch controls, responsive layouts, and tap-friendly UI throughout.

## Getting Started

```bash
npm install
npm run dev        # start dev server
npm test           # run all tests
npm run build      # production build
npm run deploy     # build + deploy to GitHub Pages
```

## Project Structure

```
src/
  apps/
    worm/           # Snake game
    block-buster/   # Breakout game
    block-party/    # Tetris game
    pac-man/        # Pac-Man with generated mazes
    bee/            # Spelling Bee word puzzle
    wordl/          # Wordle clone
    racer/          # Endless runner
    adhd20/         # D20 task randomizer
  common/           # Shared hooks, components, themes
  registry.ts       # App registry (single source of truth)
```
