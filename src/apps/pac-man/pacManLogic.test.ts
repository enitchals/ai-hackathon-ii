import { describe, it, expect } from 'vitest';
import { getMaze, canMove, hasWall, WALL_TOP, WALL_LEFT } from './mazes';
import {
  createInitialState,
  setDirection,
  tick,
  advanceLevel,
  type GameState,
} from './pacManLogic';

function makePlayingState(ghostCount = 4): GameState {
  const maze = getMaze(1);
  const state = createInitialState(maze, ghostCount);
  return setDirection(state, 'LEFT');
}

describe('maze', () => {
  it('generates a valid maze', () => {
    const maze = getMaze(1);
    expect(maze.rows).toBeGreaterThan(0);
    expect(maze.cols).toBeGreaterThan(0);
    expect(maze.cells).toHaveLength(maze.rows);
    expect(maze.cells[0]).toHaveLength(maze.cols);
  });

  it('border cells have outer walls', () => {
    const maze = getMaze(1);
    // Top-left cell should have walls on top and left
    expect(hasWall(maze.cells[0][0], WALL_TOP)).toBe(true);
    expect(hasWall(maze.cells[0][0], WALL_LEFT)).toBe(true);
  });

  it('player spawn is a reachable cell', () => {
    const maze = getMaze(1);
    const [pr, pc] = maze.playerSpawn;
    // Player spawn should have at least one open direction
    const canMoveAny = canMove(maze, pr, pc, 'UP') ||
      canMove(maze, pr, pc, 'DOWN') ||
      canMove(maze, pr, pc, 'LEFT') ||
      canMove(maze, pr, pc, 'RIGHT');
    expect(canMoveAny).toBe(true);
  });

  it('has player spawn and ghost jail', () => {
    const maze = getMaze(1);
    expect(maze.playerSpawn).toBeDefined();
    expect(maze.ghostJail.length).toBeGreaterThan(0);
  });

  it('no dead ends (every non-jail cell has >= 2 open directions)', () => {
    const maze = getMaze(1);
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    const isJail = (r: number, c: number) =>
      maze.ghostJail.some(([jr, jc]) => jr === r && jc === c);
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        if (isJail(r, c)) continue; // jail cells are intentionally enclosed
        const openCount = dirs.filter(d => canMove(maze, r, c, d)).length;
        expect(openCount).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('createInitialState', () => {
  it('creates state with dots', () => {
    const state = makePlayingState();
    expect(state.dotsRemaining).toBeGreaterThan(0);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
  });

  it('creates the right number of ghosts', () => {
    const state4 = makePlayingState(4);
    expect(state4.ghosts).toHaveLength(4);
    const state6 = makePlayingState(6);
    expect(state6.ghosts.length).toBeLessThanOrEqual(6);
  });

  it('ghosts start in jail', () => {
    const state = makePlayingState();
    expect(state.ghosts.every((g) => g.inJail)).toBe(true);
  });
});

describe('setDirection', () => {
  it('starts the game on first direction input', () => {
    const maze = getMaze(1);
    const state = createInitialState(maze, 4);
    expect(state.status).toBe('idle');
    const playing = setDirection(state, 'RIGHT');
    expect(playing.status).toBe('playing');
  });
});

describe('tick', () => {
  it('does nothing when idle', () => {
    const maze = getMaze(1);
    const state = createInitialState(maze, 4);
    const next = tick(state);
    expect(next).toBe(state);
  });

  it('advances game state when playing', () => {
    const state = makePlayingState();
    const next = tick(state);
    expect(next.tickCount).toBe(state.tickCount + 1);
  });

  it('toggles mouth animation', () => {
    const state = makePlayingState();
    const next = tick(state);
    expect(next.mouthOpen).toBe(!state.mouthOpen);
  });
});

describe('advanceLevel', () => {
  it('preserves score and lives', () => {
    let state = makePlayingState();
    state = { ...state, score: 1000, lives: 2 };
    const maze = getMaze(2);
    const next = advanceLevel(state, maze);
    expect(next.level).toBe(state.level + 1);
    expect(next.score).toBe(1000);
    expect(next.lives).toBe(2);
  });
});
