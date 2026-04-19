import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  moveLeft,
  moveRight,
  startGame,
  tickWithRng,
  LANE_COUNT,
  ITEM_POINTS,
  type RacerState,
  type Item,
} from './racerLogic';

function makeSeededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function playingState(): RacerState {
  return { ...createInitialState('medium', 'some'), status: 'playing' };
}

describe('createInitialState', () => {
  it('starts in center lane, idle', () => {
    const state = createInitialState();
    expect(state.lane).toBe(Math.floor(LANE_COUNT / 2));
    expect(state.status).toBe('idle');
    expect(state.score).toBe(0);
    expect(state.items).toHaveLength(0);
  });

  it('accepts speed and obstacle settings', () => {
    const state = createInitialState('fast', 'lots');
    expect(state.speed).toBe('fast');
    expect(state.obstacles).toBe('lots');
  });
});

describe('movement', () => {
  it('moveLeft decreases lane', () => {
    const state = playingState();
    const next = moveLeft(state);
    expect(next.lane).toBe(state.lane - 1);
  });

  it('moveRight increases lane', () => {
    const state = playingState();
    const next = moveRight(state);
    expect(next.lane).toBe(state.lane + 1);
  });

  it('clamps at left edge', () => {
    let state = { ...playingState(), lane: 0 };
    state = moveLeft(state);
    expect(state.lane).toBe(0);
  });

  it('clamps at right edge', () => {
    let state = { ...playingState(), lane: LANE_COUNT - 1 };
    state = moveRight(state);
    expect(state.lane).toBe(LANE_COUNT - 1);
  });

  it('moveLeft starts the game from idle', () => {
    const state = createInitialState();
    expect(state.status).toBe('idle');
    const next = moveLeft(state);
    expect(next.status).toBe('playing');
  });

  it('does nothing when crashed', () => {
    const state = { ...playingState(), status: 'crashed' as const, lane: 2 };
    expect(moveLeft(state).lane).toBe(2);
    expect(moveRight(state).lane).toBe(2);
  });
});

describe('tick', () => {
  it('does nothing when idle', () => {
    const state = createInitialState();
    const { state: next } = tickWithRng(state, 0.016, Math.random);
    expect(next).toBe(state);
  });

  it('increases score over time', () => {
    const state = playingState();
    const { state: next } = tickWithRng(state, 1.0, makeSeededRng(1));
    expect(next.score).toBeGreaterThan(0);
  });

  it('moves items downward', () => {
    const item: Item = { lane: 0, y: 0.2, type: 'coin', id: 1 };
    const state = { ...playingState(), items: [item] };
    const { state: next } = tickWithRng(state, 0.5, makeSeededRng(1));
    const moved = next.items.find(i => i.id === 1);
    if (moved) expect(moved.y).toBeGreaterThan(0.2);
  });

  it('removes items past the bottom', () => {
    const item: Item = { lane: 0, y: 1.05, type: 'coin', id: 1 };
    const state = { ...playingState(), items: [item] };
    const { state: next } = tickWithRng(state, 0.5, makeSeededRng(1));
    expect(next.items.find(i => i.id === 1)).toBeUndefined();
  });

  it('collects rewards when overlapping player', () => {
    const item: Item = { lane: 2, y: 0.85, type: 'coin', id: 1 };
    const state = { ...playingState(), lane: 2, items: [item] };
    const { state: next, collected } = tickWithRng(state, 0.016, makeSeededRng(1));
    expect(collected).toContain('coin');
    expect(next.score).toBeGreaterThanOrEqual(ITEM_POINTS.coin);
  });

  it('crashes on obstacle collision', () => {
    const item: Item = { lane: 2, y: 0.85, type: 'rock', id: 1 };
    const state = { ...playingState(), lane: 2, items: [item] };
    const { state: next, crashed } = tickWithRng(state, 0.016, makeSeededRng(1));
    expect(crashed).toBe(true);
    expect(next.status).toBe('crashed');
  });

  it('spawns items after enough distance', () => {
    let state = playingState();
    // Tick many times to accumulate distance
    for (let i = 0; i < 100; i++) {
      const { state: next } = tickWithRng(state, 0.05, makeSeededRng(i));
      state = next;
    }
    expect(state.items.length).toBeGreaterThan(0);
  });
});

describe('obstacle settings', () => {
  it('no obstacles with none setting', () => {
    let state: RacerState = { ...playingState(), obstacles: 'none' as const };
    for (let i = 0; i < 200; i++) {
      const { state: next } = tickWithRng(state, 0.05, makeSeededRng(i));
      state = next;
    }
    const hasObstacle = state.items.some(item => item.type === 'rock' || item.type === 'cow');
    expect(hasObstacle).toBe(false);
  });
});

describe('startGame', () => {
  it('transitions from idle to playing', () => {
    const state = createInitialState();
    const next = startGame(state);
    expect(next.status).toBe('playing');
  });

  it('no-op if already playing', () => {
    const state = playingState();
    const next = startGame(state);
    expect(next).toBe(state);
  });
});
