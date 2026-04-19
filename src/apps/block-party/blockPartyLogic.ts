// --- Types ---

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const BUFFER_ROWS = 4; // invisible rows above the board for spawning
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;

export type CellColor = number | null; // 0-6 = piece color index, null = empty

// Piece shapes defined as [row, col] offsets from pivot
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'L' | 'J';

export interface PieceShape {
  type: PieceType;
  colorIndex: number;
  rotations: [number, number][][]; // 4 rotation states, each an array of [row, col] offsets
}

// SRS rotation data — each piece has 4 rotation states
const PIECES: PieceShape[] = [
  {
    type: 'I',
    colorIndex: 0, // accent-yellow
    rotations: [
      [[0, -1], [0, 0], [0, 1], [0, 2]],
      [[-1, 1], [0, 1], [1, 1], [2, 1]],
      [[1, -1], [1, 0], [1, 1], [1, 2]],
      [[-1, 0], [0, 0], [1, 0], [2, 0]],
    ],
  },
  {
    type: 'O',
    colorIndex: 1, // accent-green
    rotations: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],
  },
  {
    type: 'T',
    colorIndex: 2, // accent-blue
    rotations: [
      [[0, -1], [0, 0], [0, 1], [-1, 0]],
      [[-1, 0], [0, 0], [1, 0], [0, 1]],
      [[0, -1], [0, 0], [0, 1], [1, 0]],
      [[-1, 0], [0, 0], [1, 0], [0, -1]],
    ],
  },
  {
    type: 'S',
    colorIndex: 3, // accent-purple
    rotations: [
      [[0, 0], [0, 1], [-1, 0], [-1, -1]],
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
      [[0, 0], [0, 1], [-1, 0], [-1, -1]],
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
    ],
  },
  {
    type: 'Z',
    colorIndex: 4, // accent-pink
    rotations: [
      [[-1, 0], [-1, 1], [0, -1], [0, 0]],
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
      [[-1, 0], [-1, 1], [0, -1], [0, 0]],
      [[-1, 0], [0, 0], [0, 1], [1, 1]],
    ],
  },
  {
    type: 'L',
    colorIndex: 5, // accent-orange
    rotations: [
      [[0, -1], [0, 0], [0, 1], [-1, 1]],
      [[-1, 0], [0, 0], [1, 0], [1, 1]],
      [[0, -1], [0, 0], [0, 1], [1, -1]],
      [[-1, -1], [-1, 0], [0, 0], [1, 0]],
    ],
  },
  {
    type: 'J',
    colorIndex: 0, // reuse yellow (with different shape it's distinct)
    rotations: [
      [[0, -1], [0, 0], [0, 1], [-1, -1]],
      [[-1, 0], [0, 0], [1, 0], [-1, 1]],
      [[0, -1], [0, 0], [0, 1], [1, 1]],
      [[-1, 0], [0, 0], [1, 0], [1, -1]],
    ],
  },
];

// SRS wall kick data
// For pieces other than I
const WALL_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0, -1], [-1, -1], [2, 0], [2, -1]],
  '1>0': [[0, 1], [1, 1], [-2, 0], [-2, 1]],
  '1>2': [[0, 1], [1, 1], [-2, 0], [-2, 1]],
  '2>1': [[0, -1], [-1, -1], [2, 0], [2, -1]],
  '2>3': [[0, 1], [-1, 1], [2, 0], [2, 1]],
  '3>2': [[0, -1], [1, -1], [-2, 0], [-2, -1]],
  '3>0': [[0, -1], [1, -1], [-2, 0], [-2, -1]],
  '0>3': [[0, 1], [-1, 1], [2, 0], [2, 1]],
};

// I-piece has different wall kicks
const I_WALL_KICKS: Record<string, [number, number][]> = {
  '0>1': [[0, -2], [0, 1], [1, -2], [-2, 1]],
  '1>0': [[0, 2], [0, -1], [-1, 2], [2, -1]],
  '1>2': [[0, -1], [0, 2], [-2, -1], [1, 2]],
  '2>1': [[0, 1], [0, -2], [2, 1], [-1, -2]],
  '2>3': [[0, 2], [0, -1], [-1, 2], [2, -1]],
  '3>2': [[0, -2], [0, 1], [1, -2], [-2, 1]],
  '3>0': [[0, 1], [0, -2], [2, 1], [-1, -2]],
  '0>3': [[0, -1], [0, 2], [-2, -1], [1, 2]],
};

export interface ActivePiece {
  shape: PieceShape;
  rotation: number; // 0-3
  row: number; // pivot row (in TOTAL_ROWS space)
  col: number; // pivot col
}

export interface GameState {
  board: CellColor[][]; // TOTAL_ROWS x COLS
  activePiece: ActivePiece | null;
  nextPieces: PieceShape[]; // queue of 3
  score: number;
  linesCleared: number;
  level: number;
  status: 'idle' | 'playing' | 'clearing' | 'gameover';
  clearingRows: number[]; // rows currently flashing
  clearTimer: number; // ticks remaining for clear animation
}

// --- Helpers ---

function getRandomPiece(): PieceShape {
  return PIECES[Math.floor(Math.random() * PIECES.length)];
}

function fillQueue(count: number): PieceShape[] {
  return Array.from({ length: count }, () => getRandomPiece());
}

export function getPieceCells(piece: ActivePiece): [number, number][] {
  const offsets = piece.shape.rotations[piece.rotation];
  return offsets.map(([dr, dc]) => [piece.row + dr, piece.col + dc]);
}

function isValid(board: CellColor[][], cells: [number, number][]): boolean {
  for (const [r, c] of cells) {
    if (c < 0 || c >= COLS || r >= TOTAL_ROWS) return false;
    if (r < 0) continue; // above the board is ok
    if (board[r][c] !== null) return false;
  }
  return true;
}

// --- Scoring ---

const LINE_SCORES = [0, 100, 300, 500, 800];

export function getDropInterval(level: number): number {
  // Start at 1000ms, reduce by 10% per level
  return Math.max(50, Math.floor(1000 * Math.pow(0.9, level - 1)));
}

// --- Game creation ---

export function createInitialState(): GameState {
  return {
    board: Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null)),
    activePiece: null,
    nextPieces: fillQueue(3),
    score: 0,
    linesCleared: 0,
    level: 1,
    status: 'idle',
    clearingRows: [],
    clearTimer: 0,
  };
}

export function startGame(state: GameState): GameState {
  if (state.status !== 'idle') return state;
  return spawnPiece({ ...state, status: 'playing' });
}

// --- Spawning ---

function spawnPiece(state: GameState): GameState {
  const shape = state.nextPieces[0];
  const nextPieces = [...state.nextPieces.slice(1), getRandomPiece()];

  const piece: ActivePiece = {
    shape,
    rotation: 0,
    row: BUFFER_ROWS - 1, // spawn just above visible area
    col: Math.floor(COLS / 2),
  };

  const cells = getPieceCells(piece);
  if (!isValid(state.board, cells)) {
    return { ...state, status: 'gameover', activePiece: null, nextPieces };
  }

  return { ...state, activePiece: piece, nextPieces };
}

// --- Movement ---

export function moveLeft(state: GameState): GameState {
  return movePiece(state, 0, -1);
}

export function moveRight(state: GameState): GameState {
  return movePiece(state, 0, 1);
}

export function softDrop(state: GameState): GameState {
  const moved = movePiece(state, 1, 0);
  if (moved === state) {
    // Can't move down — lock the piece
    return lockPiece(state);
  }
  return { ...moved, score: moved.score + 1 }; // bonus point for soft drop
}

export function hardDrop(state: GameState): GameState {
  if (!state.activePiece || state.status !== 'playing') return state;

  let current = state;
  let dropDistance = 0;
  while (true) {
    const next = movePiece(current, 1, 0);
    if (next === current) break;
    current = next;
    dropDistance++;
  }

  return lockPiece({ ...current, score: current.score + dropDistance * 2 });
}

function movePiece(state: GameState, dr: number, dc: number): GameState {
  if (!state.activePiece || state.status !== 'playing') return state;

  const newPiece: ActivePiece = {
    ...state.activePiece,
    row: state.activePiece.row + dr,
    col: state.activePiece.col + dc,
  };

  const cells = getPieceCells(newPiece);
  if (!isValid(state.board, cells)) return state;

  return { ...state, activePiece: newPiece };
}

// --- Rotation with wall kicks ---

export function rotateCW(state: GameState): GameState {
  return rotate(state, 1);
}

export function rotateCCW(state: GameState): GameState {
  return rotate(state, -1);
}

function rotate(state: GameState, direction: 1 | -1): GameState {
  if (!state.activePiece || state.status !== 'playing') return state;

  const piece = state.activePiece;
  const fromRot = piece.rotation;
  const toRot = ((fromRot + direction) % 4 + 4) % 4;

  const newPiece: ActivePiece = { ...piece, rotation: toRot };
  const cells = getPieceCells(newPiece);

  // Try basic rotation
  if (isValid(state.board, cells)) {
    return { ...state, activePiece: newPiece };
  }

  // Try wall kicks
  const kickKey = `${fromRot}>${toRot}`;
  const kicks = piece.shape.type === 'I' ? I_WALL_KICKS[kickKey] : WALL_KICKS[kickKey];

  if (kicks) {
    for (const [dr, dc] of kicks) {
      const kicked: ActivePiece = { ...newPiece, row: newPiece.row + dr, col: newPiece.col + dc };
      const kickedCells = getPieceCells(kicked);
      if (isValid(state.board, kickedCells)) {
        return { ...state, activePiece: kicked };
      }
    }
  }

  return state; // rotation failed
}

// --- Locking and line clearing ---

function lockPiece(state: GameState): GameState {
  if (!state.activePiece) return state;

  const board = state.board.map((row) => [...row]);
  const cells = getPieceCells(state.activePiece);

  for (const [r, c] of cells) {
    if (r >= 0 && r < TOTAL_ROWS) {
      board[r][c] = state.activePiece.shape.colorIndex;
    }
  }

  // Check for complete lines
  const fullRows: number[] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (board[r].every((cell) => cell !== null)) {
      fullRows.push(r);
    }
  }

  if (fullRows.length > 0) {
    return {
      ...state,
      board,
      activePiece: null,
      status: 'clearing',
      clearingRows: fullRows,
      clearTimer: 6, // ticks of animation
    };
  }

  // No lines to clear — spawn next piece
  return spawnPiece({ ...state, board, activePiece: null });
}

// --- Clear animation tick ---

export function clearTick(state: GameState): GameState {
  if (state.status !== 'clearing') return state;

  if (state.clearTimer > 0) {
    return { ...state, clearTimer: state.clearTimer - 1 };
  }

  // Remove cleared rows and add empty rows at top
  const board = state.board.map((row) => [...row]);
  const rowsToRemove = new Set(state.clearingRows);
  const remaining = board.filter((_, i) => !rowsToRemove.has(i));
  const emptyRows = Array.from({ length: rowsToRemove.size }, () =>
    Array(COLS).fill(null) as CellColor[],
  );
  const newBoard = [...emptyRows, ...remaining];

  const linesCleared = state.linesCleared + rowsToRemove.size;
  const score = state.score + LINE_SCORES[Math.min(rowsToRemove.size, 4)];
  const level = Math.floor(linesCleared / 10) + 1;

  return spawnPiece({
    ...state,
    board: newBoard,
    clearingRows: [],
    clearTimer: 0,
    linesCleared,
    score,
    level,
    status: 'playing',
  });
}

// --- Gravity tick ---

export function gravityTick(state: GameState): GameState {
  if (state.status !== 'playing' || !state.activePiece) return state;
  return softDrop(state);
}

// --- Ghost piece ---

export function getGhostPiece(state: GameState): [number, number][] | null {
  if (!state.activePiece || state.status !== 'playing') return null;

  let ghostRow = state.activePiece.row;
  while (true) {
    const testPiece: ActivePiece = { ...state.activePiece, row: ghostRow + 1 };
    const cells = getPieceCells(testPiece);
    if (!isValid(state.board, cells)) break;
    ghostRow++;
  }

  const ghost: ActivePiece = { ...state.activePiece, row: ghostRow };
  return getPieceCells(ghost);
}

// --- Preview ---

export function getPreviewCells(shape: PieceShape): [number, number][] {
  return shape.rotations[0].map(([r, c]) => [r + 1, c + 1]);
}

export { PIECES };
