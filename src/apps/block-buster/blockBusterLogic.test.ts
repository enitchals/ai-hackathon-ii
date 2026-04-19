import { describe, it, expect } from 'vitest';
import {
  createInitialState,
  launchBall,
  tick,
  movePaddle,
  generateBricks,
  advanceLevel,
  FIELD_WIDTH,
  BALL_SPEEDS,
} from './blockBusterLogic';

describe('createInitialState', () => {
  it('creates state with correct defaults', () => {
    const state = createInitialState(5, 'M', 1);
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.status).toBe('idle');
    expect(state.bricks.length).toBeGreaterThan(0);
    expect(state.ball.vx).toBe(0);
    expect(state.ball.vy).toBe(0);
  });

  it('ball sits on top of paddle when idle', () => {
    const state = createInitialState(5, 'M', 1);
    expect(state.ball.y).toBeLessThan(state.paddle.y);
    expect(state.ball.x).toBe(state.paddle.x);
  });
});

describe('launchBall', () => {
  it('sets ball velocity and status to playing', () => {
    const state = createInitialState(5, 'M', 1);
    const launched = launchBall(state, BALL_SPEEDS.medium);
    expect(launched.status).toBe('playing');
    expect(launched.ball.vy).toBeLessThan(0); // moving upward
  });

  it('does nothing if already playing', () => {
    const state = createInitialState(5, 'M', 1);
    const launched = launchBall(state, BALL_SPEEDS.medium);
    const again = launchBall(launched, BALL_SPEEDS.medium);
    expect(again).toBe(launched);
  });
});

describe('movePaddle', () => {
  it('clamps paddle within field bounds', () => {
    const state = createInitialState(5, 'M', 1);
    const moved = movePaddle(state, -100);
    expect(moved.paddle.x).toBeGreaterThanOrEqual(moved.paddle.width / 2);

    const movedRight = movePaddle(state, FIELD_WIDTH + 100);
    expect(movedRight.paddle.x).toBeLessThanOrEqual(FIELD_WIDTH - movedRight.paddle.width / 2);
  });

  it('moves ball with paddle when idle', () => {
    const state = createInitialState(5, 'M', 1);
    const moved = movePaddle(state, 100);
    expect(moved.ball.x).toBe(moved.paddle.x);
  });
});

describe('tick', () => {
  it('does nothing when not playing', () => {
    const state = createInitialState(5, 'M', 1);
    const next = tick(state, 0.016);
    expect(next).toBe(state);
  });

  it('moves the ball when playing', () => {
    let state = createInitialState(5, 'M', 1);
    state = launchBall(state, BALL_SPEEDS.medium);
    const ballY = state.ball.y;
    const next = tick(state, 0.016);
    expect(next.ball.y).not.toBe(ballY);
  });

  it('reflects ball off side walls', () => {
    let state = createInitialState(5, 'M', 1);
    state = launchBall(state, BALL_SPEEDS.medium);
    // Force ball to left wall
    state = { ...state, ball: { ...state.ball, x: 2, vx: -200, vy: -100 } };
    const next = tick(state, 0.016);
    expect(next.ball.vx).toBeGreaterThan(0); // reflected
  });
});

describe('generateBricks', () => {
  it('generates bricks for a given row count', () => {
    const bricks = generateBricks(5, 1);
    expect(bricks.length).toBeGreaterThan(0);
    expect(bricks.every((b) => b.hits >= 1)).toBe(true);
  });

  it('increases brick hits on later levels', () => {
    const level1 = generateBricks(3, 1);
    const level8 = generateBricks(3, 8); // second loop
    expect(level8[0].hits).toBeGreaterThan(level1[0].hits);
  });

  it('accepts a custom pattern', () => {
    const pattern = [
      [0, 1, null, 2, 0, 1, null, 2, 0, 1],
    ];
    const bricks = generateBricks(1, 1, pattern);
    expect(bricks.length).toBe(8); // 10 - 2 nulls
  });
});

describe('advanceLevel', () => {
  it('preserves score and lives', () => {
    let state = createInitialState(5, 'M', 1);
    state = { ...state, score: 500, lives: 2 };
    const next = advanceLevel(state, 5, 'M');
    expect(next.level).toBe(2);
    expect(next.score).toBe(500);
    expect(next.lives).toBe(2);
    expect(next.bricks.length).toBeGreaterThan(0);
  });
});
