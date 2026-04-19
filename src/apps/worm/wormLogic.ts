export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  row: number;
  col: number;
}

export interface FoodItem {
  emoji: string;
  name: string;
  points: number;
  weight: number;
}

export const FOOD_TABLE: FoodItem[] = [
  { emoji: '🍎', name: 'Apple', points: 10, weight: 40 },
  { emoji: '🍊', name: 'Orange', points: 15, weight: 25 },
  { emoji: '🍇', name: 'Grapes', points: 20, weight: 15 },
  { emoji: '🍩', name: 'Donut', points: 30, weight: 10 },
  { emoji: '🍔', name: 'Burger', points: 40, weight: 5 },
  { emoji: '🍦', name: 'Ice Cream', points: 50, weight: 3 },
  { emoji: '🍟', name: 'Fries', points: 60, weight: 2 },
];

export const GOLDEN_ITEM: FoodItem = {
  emoji: '🌟',
  name: 'Golden Apple',
  points: 100,
  weight: 0,
};

export type SkullSetting = 'no' | 'yes' | 'lots';
export type SpeedSetting = 'slow' | 'medium' | 'fast' | 'lightning';
export type GridSizeSetting = 'S' | 'M' | 'L' | 'XL';

export const GRID_SIZES: Record<GridSizeSetting, number> = {
  S: 10,
  M: 15,
  L: 20,
  XL: 25,
};

export const SPEED_MS: Record<SpeedSetting, number> = {
  slow: 500,
  medium: 250,
  fast: 150,
  lightning: 80,
};

export interface SkullEntry {
  pos: Position;
  expiresAt: number; // tick number when it despawns
}

export interface GoldenEntry {
  pos: Position;
  expiresAt: number;
}

export interface GameState {
  gridSize: number;
  worm: Position[];
  direction: Direction;
  nextDirection: Direction;
  food: { pos: Position; item: FoodItem };
  golden: GoldenEntry | null;
  skulls: SkullEntry[];
  score: number;
  status: 'idle' | 'playing' | 'gameover';
  walls: boolean;
  skullSetting: SkullSetting;
  tickCount: number;
}

// --- Helpers ---

export function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

export function getOccupiedSet(state: GameState): Set<string> {
  const set = new Set<string>();
  for (const p of state.worm) set.add(posKey(p));
  set.add(posKey(state.food.pos));
  if (state.golden) set.add(posKey(state.golden.pos));
  for (const s of state.skulls) set.add(posKey(s.pos));
  return set;
}

export function getEmptyCells(state: GameState): Position[] {
  const occupied = getOccupiedSet(state);
  const cells: Position[] = [];
  for (let row = 0; row < state.gridSize; row++) {
    for (let col = 0; col < state.gridSize; col++) {
      if (!occupied.has(posKey({ row, col }))) {
        cells.push({ row, col });
      }
    }
  }
  return cells;
}

export function pickWeightedFood(): FoodItem {
  const totalWeight = FOOD_TABLE.reduce((sum, f) => sum + f.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of FOOD_TABLE) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return FOOD_TABLE[0];
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function spawnFood(state: GameState): { pos: Position; item: FoodItem } {
  const empty = getEmptyCells(state);
  if (empty.length === 0) {
    // Board is full — shouldn't normally happen
    return state.food;
  }
  return { pos: randomFromArray(empty), item: pickWeightedFood() };
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

export function changeDirection(state: GameState, newDir: Direction): GameState {
  if (isOpposite(state.direction, newDir)) return state;
  return { ...state, nextDirection: newDir };
}

function movePosition(pos: Position, dir: Direction): Position {
  switch (dir) {
    case 'UP': return { row: pos.row - 1, col: pos.col };
    case 'DOWN': return { row: pos.row + 1, col: pos.col };
    case 'LEFT': return { row: pos.row, col: pos.col - 1 };
    case 'RIGHT': return { row: pos.row, col: pos.col + 1 };
  }
}

function wrapPosition(pos: Position, gridSize: number): Position {
  return {
    row: ((pos.row % gridSize) + gridSize) % gridSize,
    col: ((pos.col % gridSize) + gridSize) % gridSize,
  };
}

function isOutOfBounds(pos: Position, gridSize: number): boolean {
  return pos.row < 0 || pos.row >= gridSize || pos.col < 0 || pos.col >= gridSize;
}

function maxSkulls(gridSize: number, setting: SkullSetting): number {
  if (setting === 'no') return 0;
  const isSmall = gridSize <= 15;
  if (setting === 'yes') return isSmall ? 1 : 2;
  return isSmall ? 2 : 4; // 'lots'
}

function skullSpawnChance(setting: SkullSetting): number {
  if (setting === 'no') return 0;
  if (setting === 'yes') return 0.05;
  return 0.1;
}

const SKULL_DURATION = 30; // ticks (at any speed, ~15-30 seconds)
const GOLDEN_DURATION_TICKS = 60; // ~30 seconds at medium speed
const GOLDEN_SPAWN_CHANCE = 0.02;

// --- Core ---

export function createInitialState(
  gridSize: number,
  walls: boolean,
  skullSetting: SkullSetting,
): GameState {
  const mid = Math.floor(gridSize / 2);
  const worm: Position[] = [
    { row: mid, col: mid },
    { row: mid, col: mid - 1 },
    { row: mid, col: mid - 2 },
  ];

  const tempState: GameState = {
    gridSize,
    worm,
    direction: 'RIGHT',
    nextDirection: 'RIGHT',
    food: { pos: { row: 0, col: 0 }, item: FOOD_TABLE[0] },
    golden: null,
    skulls: [],
    score: 0,
    status: 'idle',
    walls,
    skullSetting,
    tickCount: 0,
  };

  const food = spawnFood(tempState);

  return { ...tempState, food };
}

export function tick(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  const direction = state.nextDirection;
  const head = state.worm[0];
  let newHead = movePosition(head, direction);

  // Wall collision or wrapping
  if (isOutOfBounds(newHead, state.gridSize)) {
    if (state.walls) {
      return { ...state, status: 'gameover' };
    }
    newHead = wrapPosition(newHead, state.gridSize);
  }

  const newHeadKey = posKey(newHead);

  // Self collision (check against all but the tail, which will move)
  // But if we're about to eat food, tail won't move — check full body
  const ateFood = posKey(state.food.pos) === newHeadKey;
  const bodyToCheck = ateFood ? state.worm : state.worm.slice(0, -1);
  for (const seg of bodyToCheck) {
    if (posKey(seg) === newHeadKey) {
      return { ...state, direction, status: 'gameover' };
    }
  }

  // Skull collision
  for (const skull of state.skulls) {
    if (posKey(skull.pos) === newHeadKey) {
      return { ...state, direction, status: 'gameover' };
    }
  }

  const tickCount = state.tickCount + 1;
  let newWorm: Position[];
  let score = state.score;
  let food = state.food;

  if (ateFood) {
    score += state.food.item.points;
    newWorm = [newHead, ...state.worm];
    const tempState = { ...state, worm: newWorm, food: state.food, golden: state.golden, skulls: state.skulls };
    food = spawnFood(tempState);
  } else {
    newWorm = [newHead, ...state.worm.slice(0, -1)];
  }

  // Golden apple
  let golden = state.golden;
  const ateGolden = golden && posKey(golden.pos) === newHeadKey;
  if (ateGolden) {
    score += GOLDEN_ITEM.points;
    golden = null;
  } else if (golden && tickCount >= golden.expiresAt) {
    golden = null;
  }

  // Maybe spawn golden
  if (!golden && !ateGolden && Math.random() < GOLDEN_SPAWN_CHANCE) {
    const tempState2 = { ...state, worm: newWorm, food, golden: null, skulls: state.skulls };
    const empty = getEmptyCells(tempState2);
    if (empty.length > 0) {
      golden = { pos: randomFromArray(empty), expiresAt: tickCount + GOLDEN_DURATION_TICKS };
    }
  }

  // Skulls — despawn expired
  let skulls = state.skulls.filter((s) => tickCount < s.expiresAt);

  // Maybe spawn skull
  const max = maxSkulls(state.gridSize, state.skullSetting);
  if (skulls.length < max && Math.random() < skullSpawnChance(state.skullSetting)) {
    const tempState3 = { ...state, worm: newWorm, food, golden, skulls };
    const empty = getEmptyCells(tempState3);
    if (empty.length > 0) {
      skulls = [...skulls, { pos: randomFromArray(empty), expiresAt: tickCount + SKULL_DURATION }];
    }
  }

  return {
    ...state,
    worm: newWorm,
    direction,
    nextDirection: direction,
    food,
    golden,
    skulls,
    score,
    tickCount,
  };
}
