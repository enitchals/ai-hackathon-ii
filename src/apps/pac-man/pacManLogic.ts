import {
  type MazeData,
  type Direction,
  canMove,
  moveInDirection,
  OPPOSITE_DIR,
} from './mazes';

// --- Types ---

export interface Position {
  row: number;
  col: number;
}

export type GhostPersonality = 'chase' | 'ambush' | 'flank' | 'shy' | 'patrol' | 'random';

const PERSONALITIES: GhostPersonality[] = ['chase', 'ambush', 'flank', 'shy', 'patrol', 'random'];

// Color indices map to theme accents: 0=yellow(pac), 1=green, 2=blue, 3=purple, 4=pink, 5=orange
// Ghost colors: use indices 1-5, plus 0 for the 6th ghost
const GHOST_COLORS = [4, 2, 3, 5, 1, 0]; // pink, blue, purple, orange, green, yellow

export interface Ghost {
  pos: Position;
  direction: Direction;
  personality: GhostPersonality;
  colorIndex: number;
  scared: boolean;
  inJail: boolean;
  releaseTimer: number; // ticks until released from jail
  speed: number; // ticks between moves (higher = slower)
  moveTick: number; // counter for speed
}

export type CellContent = 'dot' | 'power' | 'fruit' | 'empty';

export interface GameState {
  maze: MazeData;
  player: Position;
  playerDir: Direction;
  nextDir: Direction;
  ghosts: Ghost[];
  dots: CellContent[][]; // mirrors maze grid — tracks dot state
  score: number;
  lives: number;
  level: number;
  dotsRemaining: number;
  status: 'idle' | 'playing' | 'dying' | 'won' | 'gameover';
  scaredTimer: number; // ticks remaining for scared mode
  fruitActive: boolean;
  fruitTimer: number;
  mouthOpen: boolean; // animation toggle
  tickCount: number;
  ghostCount: number;
}

// --- Constants ---

const SCARED_DURATION = 70; // ~7 seconds at 10 ticks/sec
const SCARED_FLASH_START = 20; // start flashing with 2 seconds left
const FRUIT_DURATION = 50; // ticks fruit stays visible
const FRUIT_SPAWN_DOTS = 30; // spawn fruit after this many dots eaten
const FRUIT_POINTS = 200;
const DOT_POINTS = 10;
const POWER_DOT_POINTS = 50;
const GHOST_EAT_POINTS = 200;

const GHOST_BASE_SPEED = 3; // moves every N ticks
const PLAYER_SPEED = 2; // moves every N ticks (faster than ghosts)

// --- Initialization ---

export function createInitialState(maze: MazeData, ghostCount: number): GameState {
  const dots: CellContent[][] = [];
  let dotsRemaining = 0;
  const jailSet = new Set(maze.ghostJail.map(([r, c]) => `${r},${c}`));
  const playerKey = `${maze.playerSpawn[0]},${maze.playerSpawn[1]}`;
  const fruitKey = `${maze.fruitSpawn[0]},${maze.fruitSpawn[1]}`;

  for (let r = 0; r < maze.rows; r++) {
    dots[r] = [];
    for (let c = 0; c < maze.cols; c++) {
      const key = `${r},${c}`;
      if (jailSet.has(key) || key === playerKey) {
        dots[r][c] = 'empty';
      } else if (maze.powerDots.some(([pr, pc]) => pr === r && pc === c)) {
        dots[r][c] = 'power';
        dotsRemaining++;
      } else if (key === fruitKey) {
        dots[r][c] = 'dot';
        dotsRemaining++;
      } else {
        dots[r][c] = 'dot';
        dotsRemaining++;
      }
    }
  }

  const clampedCount = Math.min(ghostCount, maze.ghostJail.length, 6);
  const ghosts: Ghost[] = [];
  for (let i = 0; i < clampedCount; i++) {
    const jailPos = maze.ghostJail[i % maze.ghostJail.length];
    ghosts.push({
      pos: { row: jailPos[0], col: jailPos[1] },
      direction: 'UP',
      personality: PERSONALITIES[i],
      colorIndex: GHOST_COLORS[i],
      scared: false,
      inJail: true,
      releaseTimer: i * 15, // stagger releases
      speed: GHOST_BASE_SPEED + (i % 2), // slight speed variation
      moveTick: 0,
    });
  }

  return {
    maze,
    player: { row: maze.playerSpawn[0], col: maze.playerSpawn[1] },
    playerDir: 'LEFT',
    nextDir: 'LEFT',
    ghosts,
    dots,
    score: 0,
    lives: 3,
    level: 1,
    dotsRemaining,
    status: 'idle',
    scaredTimer: 0,
    fruitActive: false,
    fruitTimer: 0,
    mouthOpen: true,
    tickCount: 0,
    ghostCount: clampedCount,
  };
}

// --- Player input ---

export function setDirection(state: GameState, dir: Direction): GameState {
  if (state.status === 'idle') {
    return { ...state, nextDir: dir, status: 'playing' };
  }
  return { ...state, nextDir: dir };
}

// --- Main tick ---

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  let s = { ...state, tickCount: state.tickCount + 1, mouthOpen: !state.mouthOpen };

  // Move player
  if (s.tickCount % PLAYER_SPEED === 0) {
    s = movePlayer(s);
    s = checkDotPickup(s);
    s = checkGhostCollision(s);
  }

  // Move ghosts
  s = moveGhosts(s);
  s = checkGhostCollision(s); // check again after ghost movement

  // Scared timer
  if (s.scaredTimer > 0) {
    s = { ...s, scaredTimer: s.scaredTimer - 1 };
    if (s.scaredTimer === 0) {
      s = {
        ...s,
        ghosts: s.ghosts.map((g) => ({ ...g, scared: false })),
      };
    }
  }

  // Fruit timer
  if (s.fruitActive) {
    s = { ...s, fruitTimer: s.fruitTimer - 1 };
    if (s.fruitTimer <= 0) {
      s = { ...s, fruitActive: false };
    }
  }

  // Win check
  if (s.dotsRemaining <= 0) {
    s = { ...s, status: 'won' };
  }

  return s;
}

// --- Player movement ---

function movePlayer(state: GameState): GameState {
  const { player, playerDir, nextDir, maze } = state;

  // Try to turn in the requested direction first
  let dir = playerDir;
  if (canMove(maze, player.row, player.col, nextDir)) {
    dir = nextDir;
  }

  if (!canMove(maze, player.row, player.col, dir)) {
    return { ...state, playerDir: dir };
  }

  let [nr, nc] = moveInDirection(player.row, player.col, dir);

  // Tunnel wrapping
  if (nc < 0) nc = maze.cols - 1;
  else if (nc >= maze.cols) nc = 0;
  if (nr < 0) nr = maze.rows - 1;
  else if (nr >= maze.rows) nr = 0;

  return { ...state, player: { row: nr, col: nc }, playerDir: dir };
}

// --- Dot pickup ---

function checkDotPickup(state: GameState): GameState {
  const { player, dots } = state;
  const content = dots[player.row]?.[player.col];

  if (content === 'dot') {
    const newDots = dots.map((r) => [...r]);
    newDots[player.row][player.col] = 'empty';
    const dotsRemaining = state.dotsRemaining - 1;
    const score = state.score + DOT_POINTS;

    // Maybe spawn fruit
    let fruitActive = state.fruitActive;
    let fruitTimer = state.fruitTimer;
    const totalDots = state.dotsRemaining; // before this pickup
    if (!fruitActive && totalDots % FRUIT_SPAWN_DOTS === 0 && totalDots > 0) {
      fruitActive = true;
      fruitTimer = FRUIT_DURATION;
      if (newDots[state.maze.fruitSpawn[0]]?.[state.maze.fruitSpawn[1]] === 'empty') {
        newDots[state.maze.fruitSpawn[0]][state.maze.fruitSpawn[1]] = 'fruit';
      }
    }

    return { ...state, dots: newDots, score, dotsRemaining, fruitActive, fruitTimer };
  }

  if (content === 'power') {
    const newDots = dots.map((r) => [...r]);
    newDots[player.row][player.col] = 'empty';
    return {
      ...state,
      dots: newDots,
      score: state.score + POWER_DOT_POINTS,
      dotsRemaining: state.dotsRemaining - 1,
      scaredTimer: SCARED_DURATION,
      ghosts: state.ghosts.map((g) => (g.inJail ? g : { ...g, scared: true, direction: OPPOSITE_DIR[g.direction] })),
    };
  }

  if (content === 'fruit') {
    const newDots = dots.map((r) => [...r]);
    newDots[player.row][player.col] = 'empty';
    return { ...state, dots: newDots, score: state.score + FRUIT_POINTS, fruitActive: false };
  }

  return state;
}

// --- Ghost collision ---

function checkGhostCollision(state: GameState): GameState {
  let score = state.score;
  let lives = state.lives;
  let status = state.status;
  let ghosts = state.ghosts;

  for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i];
    if (g.inJail) continue;
    if (g.pos.row === state.player.row && g.pos.col === state.player.col) {
      if (g.scared) {
        // Eat the ghost — send it back to jail
        score += GHOST_EAT_POINTS;
        ghosts = ghosts.map((gh, j) =>
          j === i
            ? {
                ...gh,
                pos: { row: state.maze.ghostJail[0][0], col: state.maze.ghostJail[0][1] },
                scared: false,
                inJail: true,
                releaseTimer: 20,
              }
            : gh,
        );
      } else {
        // Player dies
        lives--;
        if (lives < 0) {
          return { ...state, lives: 0, score, status: 'gameover' };
        }
        // Reset positions
        return resetPositions({ ...state, lives, score, status: 'playing' });
      }
    }
  }

  return { ...state, score, lives, status, ghosts };
}

function resetPositions(state: GameState): GameState {
  const player = { row: state.maze.playerSpawn[0], col: state.maze.playerSpawn[1] };
  const ghosts = state.ghosts.map((g, i) => ({
    ...g,
    pos: { row: state.maze.ghostJail[i % state.maze.ghostJail.length][0], col: state.maze.ghostJail[i % state.maze.ghostJail.length][1] },
    inJail: true,
    releaseTimer: i * 15,
    scared: false,
    direction: 'UP' as Direction,
  }));
  return { ...state, player, ghosts, playerDir: 'LEFT', nextDir: 'LEFT', scaredTimer: 0 };
}

// --- Ghost AI ---

function moveGhosts(state: GameState): GameState {
  const ghosts = state.ghosts.map((ghost) => {
    // Handle jail release
    if (ghost.inJail) {
      if (ghost.releaseTimer > 0) {
        return { ...ghost, releaseTimer: ghost.releaseTimer - 1 };
      }
      // Release: move to just outside jail
      // Find a non-wall, non-jail cell adjacent to current position
      const exitDir: Direction[] = ['UP', 'LEFT', 'RIGHT', 'DOWN'];
      for (const dir of exitDir) {
        if (canMove(state.maze, ghost.pos.row, ghost.pos.col, dir)) {
          const [nr, nc] = moveInDirection(ghost.pos.row, ghost.pos.col, dir);
          if (nr >= 0 && nr < state.maze.rows && nc >= 0 && nc < state.maze.cols) {
            return { ...ghost, inJail: false, pos: { row: nr, col: nc }, direction: dir };
          }
        }
      }
      return { ...ghost, inJail: false };
    }

    // Speed control
    const nextMoveTick = ghost.moveTick + 1;
    if (nextMoveTick < ghost.speed) {
      return { ...ghost, moveTick: nextMoveTick };
    }

    // Time to move
    const target = getGhostTarget(ghost, state);
    const newDir = chooseGhostDirection(ghost, state.maze, target, ghost.scared);

    let [nr, nc] = moveInDirection(ghost.pos.row, ghost.pos.col, newDir);

    // Tunnel wrapping
    if (nc < 0) nc = state.maze.cols - 1;
    else if (nc >= state.maze.cols) nc = 0;
    if (nr < 0) nr = state.maze.rows - 1;
    else if (nr >= state.maze.rows) nr = 0;

    return { ...ghost, pos: { row: nr, col: nc }, direction: newDir, moveTick: 0 };
  });

  return { ...state, ghosts };
}

function getGhostTarget(ghost: Ghost, state: GameState): Position {
  if (ghost.scared) {
    // Flee: target the opposite corner from the player
    return {
      row: state.player.row < state.maze.rows / 2 ? state.maze.rows - 1 : 0,
      col: state.player.col < state.maze.cols / 2 ? state.maze.cols - 1 : 0,
    };
  }

  switch (ghost.personality) {
    case 'chase':
      // Direct pursuit — target player position
      return state.player;

    case 'ambush': {
      // Target 4 cells ahead of player
      const [ar, ac] = moveInDirection(state.player.row, state.player.col, state.playerDir);
      const [br, bc] = moveInDirection(ar, ac, state.playerDir);
      const [cr, cc] = moveInDirection(br, bc, state.playerDir);
      const [dr, dc] = moveInDirection(cr, cc, state.playerDir);
      return { row: Math.max(0, Math.min(state.maze.rows - 1, dr)), col: Math.max(0, Math.min(state.maze.cols - 1, dc)) };
    }

    case 'flank': {
      // Use the chase ghost's position to flank
      const chaser = state.ghosts.find((g) => g.personality === 'chase');
      if (!chaser) return state.player;
      // Target is player position mirrored around the chaser
      return {
        row: Math.max(0, Math.min(state.maze.rows - 1, 2 * state.player.row - chaser.pos.row)),
        col: Math.max(0, Math.min(state.maze.cols - 1, 2 * state.player.col - chaser.pos.col)),
      };
    }

    case 'shy': {
      // Chase when far, scatter when close
      const dist = Math.abs(ghost.pos.row - state.player.row) + Math.abs(ghost.pos.col - state.player.col);
      if (dist > 8) return state.player;
      return { row: state.maze.rows - 1, col: 0 }; // scatter to corner
    }

    case 'patrol':
      // Cycle through corners
      const corners: Position[] = [
        { row: 1, col: 1 },
        { row: 1, col: state.maze.cols - 2 },
        { row: state.maze.rows - 2, col: state.maze.cols - 2 },
        { row: state.maze.rows - 2, col: 1 },
      ];
      return corners[Math.floor(state.tickCount / 40) % corners.length];

    case 'random':
      // Random target changes periodically
      return {
        row: Math.floor(Math.random() * state.maze.rows),
        col: Math.floor(Math.random() * state.maze.cols),
      };

    default:
      return state.player;
  }
}

function chooseGhostDirection(ghost: Ghost, maze: MazeData, target: Position, scared: boolean): Direction {
  const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  const opposite = OPPOSITE_DIR[ghost.direction];

  // Get valid directions (excluding reverse unless no other option)
  const valid = dirs.filter(
    (d) => d !== opposite && canMove(maze, ghost.pos.row, ghost.pos.col, d),
  );

  if (valid.length === 0) {
    // Dead end — must reverse
    if (canMove(maze, ghost.pos.row, ghost.pos.col, opposite)) return opposite;
    return ghost.direction; // stuck (shouldn't happen in a valid maze)
  }

  if (valid.length === 1) return valid[0];

  if (scared) {
    // Random direction when scared
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // Choose direction closest to target (manhattan distance)
  let bestDir = valid[0];
  let bestDist = Infinity;
  for (const d of valid) {
    const [nr, nc] = moveInDirection(ghost.pos.row, ghost.pos.col, d);
    const dist = Math.abs(nr - target.row) + Math.abs(nc - target.col);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = d;
    }
  }

  return bestDir;
}

// --- Level progression ---

export function advanceLevel(state: GameState, maze: MazeData): GameState {
  const newState = createInitialState(maze, state.ghostCount);
  return { ...newState, score: state.score, lives: state.lives, level: state.level + 1, status: 'idle' };
}

// --- Helpers ---

export function isScaredFlashing(state: GameState): boolean {
  return state.scaredTimer > 0 && state.scaredTimer <= SCARED_FLASH_START;
}

export { SCARED_FLASH_START };
