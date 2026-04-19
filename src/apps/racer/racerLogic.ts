// ---------- settings ----------

export type SpeedSetting = 'slow' | 'medium' | 'fast' | 'lightning';
export type ObstacleSetting = 'none' | 'some' | 'lots';

/** Pixels per second at each speed setting */
export const SPEED_PPS: Record<SpeedSetting, number> = {
  slow: 150,
  medium: 250,
  fast: 400,
  lightning: 600,
};

// ---------- items ----------

export type ItemType = 'coin' | 'cash' | 'bag' | 'rock' | 'cow';

export const ITEM_EMOJI: Record<ItemType, string> = {
  coin: '🪙',
  cash: '💵',
  bag: '💰',
  rock: '🪨',
  cow: '🐄',
};

export const ITEM_POINTS: Record<ItemType, number> = {
  coin: 10,
  cash: 30,
  bag: 50,
  rock: 0,
  cow: 0,
};

export const OBSTACLES: ItemType[] = ['rock', 'cow'];
export const REWARDS: ItemType[] = ['coin', 'cash', 'bag'];

const REWARD_WEIGHTS = [
  { type: 'coin' as ItemType, weight: 60 },
  { type: 'cash' as ItemType, weight: 30 },
  { type: 'bag' as ItemType, weight: 10 },
];

export interface Item {
  lane: number;
  y: number; // 0 = top of screen, 1 = bottom
  type: ItemType;
  id: number;
}

// ---------- state ----------

export const LANE_COUNT = 5;
const PLAYER_Y = 0.85; // player sits at 85% from top
const ITEM_HIT_RADIUS = 0.06; // collision threshold in screen fraction
const SPAWN_INTERVAL = 0.35; // spawn every this fraction of screen scrolled

export interface RacerState {
  lane: number;
  items: Item[];
  score: number;
  distance: number; // total distance scrolled (in screen fractions)
  status: 'idle' | 'playing' | 'crashed';
  speed: SpeedSetting;
  obstacles: ObstacleSetting;
  nextItemId: number;
  nextSpawnAt: number; // distance at which to spawn next batch
}

// ---------- creation ----------

export function createInitialState(
  speed: SpeedSetting = 'medium',
  obstacles: ObstacleSetting = 'some',
): RacerState {
  return {
    lane: Math.floor(LANE_COUNT / 2),
    items: [],
    score: 0,
    distance: 0,
    status: 'idle',
    speed,
    obstacles,
    nextItemId: 1,
    nextSpawnAt: SPAWN_INTERVAL,
  };
}

// ---------- actions ----------

export function moveLeft(state: RacerState): RacerState {
  if (state.status === 'idle') return { ...state, status: 'playing', lane: Math.max(0, state.lane - 1) };
  if (state.status !== 'playing') return state;
  if (state.lane <= 0) return state;
  return { ...state, lane: state.lane - 1 };
}

export function moveRight(state: RacerState): RacerState {
  if (state.status === 'idle') return { ...state, status: 'playing', lane: Math.min(LANE_COUNT - 1, state.lane + 1) };
  if (state.status !== 'playing') return state;
  if (state.lane >= LANE_COUNT - 1) return state;
  return { ...state, lane: state.lane + 1 };
}

export function startGame(state: RacerState): RacerState {
  if (state.status !== 'idle') return state;
  return { ...state, status: 'playing' };
}

// ---------- spawning ----------

function pickReward(rand: () => number): ItemType {
  const totalWeight = REWARD_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = rand() * totalWeight;
  for (const { type, weight } of REWARD_WEIGHTS) {
    r -= weight;
    if (r <= 0) return type;
  }
  return 'coin';
}

function pickObstacle(rand: () => number): ItemType {
  return rand() < 0.6 ? 'rock' : 'cow';
}

function spawnItems(state: RacerState, rand: () => number): RacerState {
  const { obstacles } = state;
  let nextId = state.nextItemId;
  const newItems: Item[] = [];

  // Decide how many items to spawn (1-3)
  const count = 1 + Math.floor(rand() * 2.5);

  // Track which lanes are used to avoid stacking
  const usedLanes = new Set<number>();

  for (let i = 0; i < count; i++) {
    let lane: number;
    let attempts = 0;
    do {
      lane = Math.floor(rand() * LANE_COUNT);
      attempts++;
    } while (usedLanes.has(lane) && attempts < 10);
    if (usedLanes.has(lane)) continue;
    usedLanes.add(lane);

    // Decide type
    let type: ItemType;
    const obstacleChance = obstacles === 'none' ? 0 : obstacles === 'some' ? 0.3 : 0.5;
    if (rand() < obstacleChance) {
      type = pickObstacle(rand);
    } else {
      type = pickReward(rand);
    }

    newItems.push({ lane, y: -0.05, type, id: nextId++ });
  }

  // Safety: if ALL lanes would be blocked by obstacles, convert one to a reward
  if (obstacles !== 'none') {
    const obstacleItems = newItems.filter(item => OBSTACLES.includes(item.type));
    // Check existing items near the top too
    const nearTop = state.items.filter(item => item.y < 0.15 && OBSTACLES.includes(item.type));
    const allBlocked = [...obstacleItems, ...nearTop];
    const blockedLanes = new Set(allBlocked.map(item => item.lane));
    if (blockedLanes.size >= LANE_COUNT) {
      // Convert one of the new obstacles to a coin
      const toConvert = obstacleItems[0];
      if (toConvert) toConvert.type = 'coin';
    }
  }

  return {
    ...state,
    items: [...state.items, ...newItems],
    nextItemId: nextId,
  };
}

// ---------- tick ----------

export interface TickResult {
  state: RacerState;
  collected: ItemType[];
  crashed: boolean;
}

export function tick(state: RacerState, deltaSeconds: number): TickResult {
  if (state.status !== 'playing') {
    return { state, collected: [], crashed: false };
  }

  const pps = SPEED_PPS[state.speed];
  // deltaY is in screen fractions (0-1), where 1 = full screen height
  // We treat the "screen" as roughly 600px for speed calibration
  const deltaY = (pps * deltaSeconds) / 600;

  let distance = state.distance + deltaY;
  let score = state.score + Math.round(deltaSeconds * pps * 0.1); // distance score

  // Move items
  const movedItems = state.items.map(item => ({ ...item, y: item.y + deltaY }));

  // Check collisions with player
  const collected: ItemType[] = [];
  let crashed = false;
  const surviving: Item[] = [];

  for (const item of movedItems) {
    if (item.lane === state.lane && Math.abs(item.y - PLAYER_Y) < ITEM_HIT_RADIUS) {
      if (OBSTACLES.includes(item.type)) {
        crashed = true;
      } else {
        collected.push(item.type);
        score += ITEM_POINTS[item.type];
      }
    } else if (item.y < 1.1) {
      surviving.push(item);
    }
    // Items past y=1.1 are removed
  }

  let next: RacerState = {
    ...state,
    items: surviving,
    score,
    distance,
    status: crashed ? 'crashed' : 'playing',
  };

  // Spawn new items
  if (distance >= state.nextSpawnAt && !crashed) {
    next = spawnItems(
      { ...next, nextSpawnAt: state.nextSpawnAt + SPAWN_INTERVAL },
      Math.random,
    );
  }

  return { state: next, collected, crashed };
}

// ---------- deterministic tick for testing ----------

export function tickWithRng(
  state: RacerState,
  deltaSeconds: number,
  rand: () => number,
): TickResult {
  if (state.status !== 'playing') {
    return { state, collected: [], crashed: false };
  }

  const pps = SPEED_PPS[state.speed];
  const deltaY = (pps * deltaSeconds) / 600;

  let distance = state.distance + deltaY;
  let score = state.score + Math.round(deltaSeconds * pps * 0.1);

  const movedItems = state.items.map(item => ({ ...item, y: item.y + deltaY }));
  const collected: ItemType[] = [];
  let crashed = false;
  const surviving: Item[] = [];

  for (const item of movedItems) {
    if (item.lane === state.lane && Math.abs(item.y - PLAYER_Y) < ITEM_HIT_RADIUS) {
      if (OBSTACLES.includes(item.type)) {
        crashed = true;
      } else {
        collected.push(item.type);
        score += ITEM_POINTS[item.type];
      }
    } else if (item.y < 1.1) {
      surviving.push(item);
    }
  }

  let next: RacerState = {
    ...state,
    items: surviving,
    score,
    distance,
    status: crashed ? 'crashed' : 'playing',
  };

  if (distance >= state.nextSpawnAt && !crashed) {
    next = spawnItems(
      { ...next, nextSpawnAt: state.nextSpawnAt + SPAWN_INTERVAL },
      rand,
    );
  }

  return { state: next, collected, crashed };
}
