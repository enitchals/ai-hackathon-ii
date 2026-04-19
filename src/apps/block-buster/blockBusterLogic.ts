// --- Types ---

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Paddle {
  x: number; // center x
  width: number;
  height: number;
  y: number; // top of paddle
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number; // 0-5 maps to theme accents
  hits: number; // hits remaining before destroyed
}

export type GameStatus = 'idle' | 'playing' | 'between-lives' | 'gameover' | 'won';

export interface GameState {
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  lives: number;
  score: number;
  level: number;
  status: GameStatus;
  fieldWidth: number;
  fieldHeight: number;
}

export type PaddleSize = 'S' | 'M' | 'L';
export type BallSpeed = 'slow' | 'medium' | 'fast' | 'lightning';

// --- Constants ---

export const FIELD_WIDTH = 400;
export const FIELD_HEIGHT = 500;

const BRICK_ROWS_MAX = 12; // visual max before it's too cramped
const BRICK_COLS = 10;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 2;
const BRICK_TOP_OFFSET = 40;

const PADDLE_Y = FIELD_HEIGHT - 35;

export const PADDLE_WIDTHS: Record<PaddleSize, number> = {
  S: 50,
  M: 75,
  L: 110,
};

export const BALL_SPEEDS: Record<BallSpeed, number> = {
  slow: 200,
  medium: 300,
  fast: 420,
  lightning: 560,
};

const BALL_RADIUS = 5;
const MAX_BOUNCE_ANGLE = (60 * Math.PI) / 180; // ±60° from vertical

// --- Level patterns ---

export type PatternName = 'rows' | 'checkerboard' | 'diamond' | 'pyramid' | 'invader' | 'stripes' | 'random';

const PATTERN_ORDER: PatternName[] = ['rows', 'checkerboard', 'diamond', 'pyramid', 'invader', 'stripes', 'random'];

function generatePattern(pattern: PatternName, rows: number, cols: number): (number | null)[][] {
  const grid: (number | null)[][] = [];

  switch (pattern) {
    case 'rows':
      for (let r = 0; r < rows; r++) {
        grid.push(Array.from({ length: cols }, () => r % 6));
      }
      break;

    case 'checkerboard':
      for (let r = 0; r < rows; r++) {
        grid.push(Array.from({ length: cols }, (_, c) => (r + c) % 2 === 0 ? (r + c) % 6 : null));
      }
      break;

    case 'diamond': {
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      const maxDist = Math.min(midR, midC);
      for (let r = 0; r < rows; r++) {
        grid.push(Array.from({ length: cols }, (_, c) => {
          const dist = Math.abs(r - midR) + Math.abs(c - midC);
          return dist <= maxDist ? dist % 6 : null;
        }));
      }
      break;
    }

    case 'pyramid':
      for (let r = 0; r < rows; r++) {
        const indent = rows - 1 - r;
        grid.push(Array.from({ length: cols }, (_, c) =>
          c >= indent && c < cols - indent ? r % 6 : null,
        ));
      }
      break;

    case 'invader': {
      // Simple space invader shape scaled to fit
      const invader = [
        '  X    X  ',
        '   X  X   ',
        '  XXXXXX  ',
        ' XX XX XX ',
        'XXXXXXXXXX',
        'X XXXXXX X',
        'X X    X X',
        '   XX XX  ',
      ];
      for (let r = 0; r < rows; r++) {
        const patternRow = invader[r % invader.length];
        grid.push(Array.from({ length: cols }, (_, c) => {
          const ci = Math.floor((c / cols) * patternRow.length);
          return patternRow[ci] === 'X' ? (r + c) % 6 : null;
        }));
      }
      break;
    }

    case 'stripes':
      for (let r = 0; r < rows; r++) {
        grid.push(Array.from({ length: cols }, (_, c) =>
          c % 3 !== 1 ? (r + c) % 6 : null,
        ));
      }
      break;

    case 'random':
      for (let r = 0; r < rows; r++) {
        grid.push(Array.from({ length: cols }, () =>
          Math.random() < 0.6 ? Math.floor(Math.random() * 6) : null,
        ));
      }
      break;
  }

  return grid;
}

export function generateBricks(rows: number, level: number, customPattern?: (number | null)[][]): Brick[] {
  const brickWidth = (FIELD_WIDTH - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS;
  const pattern = customPattern ?? generatePattern(
    PATTERN_ORDER[(level - 1) % PATTERN_ORDER.length],
    rows,
    BRICK_COLS,
  );
  const extraHits = Math.floor((level - 1) / PATTERN_ORDER.length); // loop adds durability

  const bricks: Brick[] = [];
  for (let r = 0; r < pattern.length; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      const colorIndex = pattern[r]?.[c];
      if (colorIndex == null) continue;
      bricks.push({
        x: BRICK_PADDING + c * (brickWidth + BRICK_PADDING),
        y: BRICK_TOP_OFFSET + r * (BRICK_HEIGHT + BRICK_PADDING),
        width: brickWidth,
        height: BRICK_HEIGHT,
        colorIndex,
        hits: 1 + extraHits,
      });
    }
  }
  return bricks;
}

// --- Game creation ---

export function createInitialState(
  rows: number,
  paddleSize: PaddleSize,
  level: number,
  customPattern?: (number | null)[][],
): GameState {
  const pw = PADDLE_WIDTHS[paddleSize];
  const paddle: Paddle = {
    x: FIELD_WIDTH / 2,
    width: pw,
    height: 10,
    y: PADDLE_Y,
  };

  return {
    ball: resetBall(paddle),
    paddle,
    bricks: generateBricks(rows, level, customPattern),
    lives: 3,
    score: 0,
    level,
    status: 'idle',
    fieldWidth: FIELD_WIDTH,
    fieldHeight: FIELD_HEIGHT,
  };
}

function resetBall(paddle: Paddle): Ball {
  return {
    x: paddle.x,
    y: paddle.y - BALL_RADIUS - 1,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
  };
}

// --- Launch ---

export function launchBall(state: GameState, speed: number): GameState {
  if (state.status !== 'idle' && state.status !== 'between-lives') return state;
  // Launch slightly off-center for variety
  const angle = (Math.random() - 0.5) * 0.6; // slight random angle
  return {
    ...state,
    status: 'playing',
    ball: {
      ...state.ball,
      vx: speed * Math.sin(angle),
      vy: -speed * Math.cos(angle),
    },
  };
}

// --- Paddle movement ---

export function movePaddle(state: GameState, x: number): GameState {
  const halfW = state.paddle.width / 2;
  const clampedX = Math.max(halfW, Math.min(FIELD_WIDTH - halfW, x));
  const paddle = { ...state.paddle, x: clampedX };

  // If ball is sitting on paddle (idle/between-lives), move it too
  if (state.status === 'idle' || state.status === 'between-lives') {
    return {
      ...state,
      paddle,
      ball: { ...state.ball, x: clampedX, y: paddle.y - BALL_RADIUS - 1 },
    };
  }

  return { ...state, paddle };
}

// --- Physics tick ---

export function tick(state: GameState, dt: number): GameState {
  if (state.status !== 'playing') return state;

  let { ball, bricks, score, lives, status, level } = state;
  const { paddle, fieldWidth, fieldHeight } = state;

  let { x, y, vx, vy } = ball;
  const r = ball.radius;

  // Move
  x += vx * dt;
  y += vy * dt;

  // Wall collisions
  if (x - r <= 0) { x = r; vx = Math.abs(vx); }
  if (x + r >= fieldWidth) { x = fieldWidth - r; vx = -Math.abs(vx); }
  if (y - r <= 0) { y = r; vy = Math.abs(vy); }

  // Bottom — lose life
  if (y + r >= fieldHeight) {
    lives--;
    if (lives < 0) {
      return { ...state, lives: 0, score, bricks, status: 'gameover' };
    }
    const newBall = resetBall(paddle);
    return { ...state, ball: newBall, lives, score, bricks, status: 'between-lives' };
  }

  // Paddle collision
  if (
    vy > 0 &&
    y + r >= paddle.y &&
    y + r <= paddle.y + paddle.height + vy * dt &&
    x >= paddle.x - paddle.width / 2 &&
    x <= paddle.x + paddle.width / 2
  ) {
    // Where on the paddle did it hit? -1 (left edge) to 1 (right edge)
    const hitPos = (x - paddle.x) / (paddle.width / 2);
    const angle = hitPos * MAX_BOUNCE_ANGLE;
    const speed = Math.sqrt(vx * vx + vy * vy);
    vx = speed * Math.sin(angle);
    vy = -speed * Math.cos(angle);
    y = paddle.y - r;
  }

  // Brick collisions (check all, handle first hit)
  let hitIndex = -1;
  let hitFace: 'top' | 'bottom' | 'left' | 'right' = 'top';

  for (let i = 0; i < bricks.length; i++) {
    const b = bricks[i];
    // AABB check with ball radius
    if (
      x + r > b.x &&
      x - r < b.x + b.width &&
      y + r > b.y &&
      y - r < b.y + b.height
    ) {
      // Determine which face was hit based on overlap depth
      const overlapLeft = (x + r) - b.x;
      const overlapRight = (b.x + b.width) - (x - r);
      const overlapTop = (y + r) - b.y;
      const overlapBottom = (b.y + b.height) - (y - r);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop) hitFace = 'top';
      else if (minOverlap === overlapBottom) hitFace = 'bottom';
      else if (minOverlap === overlapLeft) hitFace = 'left';
      else hitFace = 'right';

      hitIndex = i;
      break; // one brick per tick
    }
  }

  if (hitIndex >= 0) {
    if (hitFace === 'top' || hitFace === 'bottom') vy = -vy;
    else vx = -vx;

    const brick = bricks[hitIndex];
    const newHits = brick.hits - 1;
    if (newHits <= 0) {
      bricks = bricks.filter((_, i) => i !== hitIndex);
      score += 10;
    } else {
      bricks = bricks.map((b, i) => i === hitIndex ? { ...b, hits: newHits } : b);
      score += 5;
    }
  }

  // Win check
  if (bricks.length === 0) {
    return {
      ...state,
      ball: { ...ball, x, y, vx, vy },
      bricks,
      score,
      lives,
      status: 'won' as GameStatus,
      level,
    };
  }

  return {
    ...state,
    ball: { ...ball, x, y, vx, vy },
    bricks,
    score,
    lives,
    status,
    level,
  };
}

// --- Level advancement ---

export function advanceLevel(state: GameState, rows: number, paddleSize: PaddleSize): GameState {
  const nextLevel = state.level + 1;
  const newState = createInitialState(rows, paddleSize, nextLevel);
  return { ...newState, score: state.score, lives: state.lives, status: 'idle' };
}

// --- Helpers ---

export function getMaxRows(): number {
  return BRICK_ROWS_MAX;
}

export function getPatternName(level: number): PatternName {
  return PATTERN_ORDER[(level - 1) % PATTERN_ORDER.length];
}

export const BRICK_COLS_COUNT = BRICK_COLS;
