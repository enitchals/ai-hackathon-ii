import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  tick,
  changeDirection,
  isOpposite,
  posKey,
  getEmptyCells,
  type GameState,
} from './wormLogic';

function makePlayingState(overrides?: Partial<GameState>): GameState {
  const state = createInitialState(10, true, 'no');
  return { ...state, status: 'playing', ...overrides };
}

describe('isOpposite', () => {
  it('detects opposite directions', () => {
    expect(isOpposite('UP', 'DOWN')).toBe(true);
    expect(isOpposite('LEFT', 'RIGHT')).toBe(true);
    expect(isOpposite('UP', 'LEFT')).toBe(false);
    expect(isOpposite('DOWN', 'DOWN')).toBe(false);
  });
});

describe('createInitialState', () => {
  it('creates a worm of length 3 in the center', () => {
    const state = createInitialState(15, true, 'no');
    expect(state.worm).toHaveLength(3);
    expect(state.worm[0]).toEqual({ row: 7, col: 7 }); // head at center
    expect(state.direction).toBe('RIGHT');
    expect(state.status).toBe('idle');
  });

  it('places food on an empty cell', () => {
    const state = createInitialState(10, true, 'no');
    const wormKeys = new Set(state.worm.map(posKey));
    expect(wormKeys.has(posKey(state.food.pos))).toBe(false);
  });
});

describe('changeDirection', () => {
  it('changes direction to a non-opposite', () => {
    const state = makePlayingState();
    const updated = changeDirection(state, 'UP');
    expect(updated.nextDirection).toBe('UP');
  });

  it('ignores opposite direction', () => {
    const state = makePlayingState(); // facing RIGHT
    const updated = changeDirection(state, 'LEFT');
    expect(updated.nextDirection).toBe('RIGHT');
  });
});

describe('tick', () => {
  it('moves the worm forward', () => {
    const state = makePlayingState();
    const head = state.worm[0];
    const next = tick(state);
    expect(next.worm[0]).toEqual({ row: head.row, col: head.col + 1 });
    expect(next.worm).toHaveLength(3); // no food eaten
  });

  it('does not tick when idle', () => {
    const state = createInitialState(10, true, 'no');
    const next = tick(state);
    expect(next).toBe(state); // same reference, no change
  });

  it('ends game on wall collision', () => {
    const state = makePlayingState({
      worm: [
        { row: 0, col: 9 }, // head at right edge
        { row: 0, col: 8 },
        { row: 0, col: 7 },
      ],
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
    });
    const next = tick(state);
    expect(next.status).toBe('gameover');
  });

  it('wraps around when walls are off', () => {
    const state = makePlayingState({
      worm: [
        { row: 0, col: 9 },
        { row: 0, col: 8 },
        { row: 0, col: 7 },
      ],
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
      walls: false,
    });
    const next = tick(state);
    expect(next.status).toBe('playing');
    expect(next.worm[0]).toEqual({ row: 0, col: 0 });
  });

  it('ends game on self collision', () => {
    // Worm coiled so moving down hits its own body
    const state = makePlayingState({
      worm: [
        { row: 1, col: 3 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 1, col: 4 },
        { row: 0, col: 4 },
      ],
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
    });
    // Head at (1,3) moves right to (1,4) — body at (1,4) won't be tail so collision
    const next = tick(state);
    expect(next.status).toBe('gameover');
  });

  it('grows the worm when eating food', () => {
    const state = makePlayingState({
      worm: [
        { row: 0, col: 3 },
        { row: 0, col: 2 },
        { row: 0, col: 1 },
      ],
      food: {
        pos: { row: 0, col: 4 },
        item: { emoji: '🍎', name: 'Apple', points: 10, weight: 40 },
      },
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
    });
    const next = tick(state);
    expect(next.worm).toHaveLength(4);
    expect(next.score).toBe(10);
  });

  it('ends game on skull collision', () => {
    const state = makePlayingState({
      worm: [
        { row: 0, col: 3 },
        { row: 0, col: 2 },
        { row: 0, col: 1 },
      ],
      skulls: [{ pos: { row: 0, col: 4 }, expiresAt: 999 }],
      direction: 'RIGHT',
      nextDirection: 'RIGHT',
    });
    const next = tick(state);
    expect(next.status).toBe('gameover');
  });
});

describe('getEmptyCells', () => {
  it('excludes worm and food positions', () => {
    const state = createInitialState(5, true, 'no');
    const empty = getEmptyCells(state);
    const emptyKeys = new Set(empty.map(posKey));
    for (const seg of state.worm) {
      expect(emptyKeys.has(posKey(seg))).toBe(false);
    }
    expect(emptyKeys.has(posKey(state.food.pos))).toBe(false);
    expect(empty.length).toBe(25 - 3 - 1); // grid - worm - food
  });
});
