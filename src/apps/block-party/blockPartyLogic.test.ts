import { describe, it, expect } from 'vitest';
import {
  COLS,
  TOTAL_ROWS,
  createInitialState,
  startGame,
  moveLeft,
  moveRight,
  softDrop,
  hardDrop,
  rotateCW,
  rotateCCW,
  gravityTick,
  clearTick,
  getPieceCells,
  getGhostPiece,
  getDropInterval,
  type GameState,
} from './blockPartyLogic';

function makePlayingState(): GameState {
  const state = createInitialState();
  return startGame(state);
}

describe('createInitialState', () => {
  it('creates an empty board with 3 next pieces', () => {
    const state = createInitialState();
    expect(state.board).toHaveLength(TOTAL_ROWS);
    expect(state.board[0]).toHaveLength(COLS);
    expect(state.nextPieces).toHaveLength(3);
    expect(state.status).toBe('idle');
    expect(state.score).toBe(0);
  });
});

describe('startGame', () => {
  it('spawns a piece and sets status to playing', () => {
    const state = createInitialState();
    const started = startGame(state);
    expect(started.status).toBe('playing');
    expect(started.activePiece).not.toBeNull();
    expect(started.nextPieces).toHaveLength(3);
  });

  it('does nothing if already playing', () => {
    const playing = makePlayingState();
    const again = startGame(playing);
    expect(again).toBe(playing);
  });
});

describe('movement', () => {
  it('moves piece left', () => {
    const state = makePlayingState();
    const col = state.activePiece!.col;
    const moved = moveLeft(state);
    expect(moved.activePiece!.col).toBe(col - 1);
  });

  it('moves piece right', () => {
    const state = makePlayingState();
    const col = state.activePiece!.col;
    const moved = moveRight(state);
    expect(moved.activePiece!.col).toBe(col + 1);
  });

  it('prevents moving out of bounds left', () => {
    let state = makePlayingState();
    for (let i = 0; i < 20; i++) state = moveLeft(state);
    const cells = getPieceCells(state.activePiece!);
    expect(cells.every(([, c]) => c >= 0)).toBe(true);
  });

  it('prevents moving out of bounds right', () => {
    let state = makePlayingState();
    for (let i = 0; i < 20; i++) state = moveRight(state);
    const cells = getPieceCells(state.activePiece!);
    expect(cells.every(([, c]) => c < COLS)).toBe(true);
  });
});

describe('softDrop', () => {
  it('moves piece down and adds score', () => {
    const state = makePlayingState();
    const row = state.activePiece!.row;
    const dropped = softDrop(state);
    if (dropped.activePiece) {
      expect(dropped.activePiece.row).toBe(row + 1);
      expect(dropped.score).toBe(state.score + 1);
    }
  });
});

describe('hardDrop', () => {
  it('drops piece to the bottom and locks it', () => {
    const state = makePlayingState();
    const dropped = hardDrop(state);
    // Score should increase from hard drop bonus
    expect(dropped.score).toBeGreaterThan(state.score);
    // Board should have some filled cells at the bottom
    const bottomRows = dropped.board.slice(-3);
    const hasFilled = bottomRows.some((row) => row.some((c) => c !== null));
    expect(hasFilled).toBe(true);
  });
});

describe('rotation', () => {
  it('rotates clockwise', () => {
    const state = makePlayingState();
    const rot = state.activePiece!.rotation;
    const rotated = rotateCW(state);
    if (rotated.activePiece) {
      expect(rotated.activePiece.rotation).toBe((rot + 1) % 4);
    }
  });

  it('rotates counter-clockwise', () => {
    const state = makePlayingState();
    const rot = state.activePiece!.rotation;
    const rotated = rotateCCW(state);
    if (rotated.activePiece) {
      expect(rotated.activePiece.rotation).toBe((rot + 3) % 4);
    }
  });

  it('full rotation returns to original', () => {
    const state = makePlayingState();
    let current = state;
    for (let i = 0; i < 4; i++) current = rotateCW(current);
    expect(current.activePiece!.rotation).toBe(state.activePiece!.rotation);
  });
});

describe('line clearing', () => {
  it('detects full rows and enters clearing state', () => {
    const state = makePlayingState();
    // Fill the bottom row completely
    const board = state.board.map((row) => [...row]);
    const bottomRow = TOTAL_ROWS - 1;
    for (let c = 0; c < COLS; c++) {
      board[bottomRow][c] = 0;
    }
    // Leave one cell empty so the hard drop locks without clearing the piece's own row
    const modState: GameState = { ...state, board };

    // The clearing should happen when a piece locks onto a full row
    // We can test the clearTick directly
    const clearingState: GameState = {
      ...modState,
      status: 'clearing',
      clearingRows: [bottomRow],
      clearTimer: 0,
      activePiece: null,
    };
    const cleared = clearTick(clearingState);
    expect(cleared.linesCleared).toBe(1);
    expect(cleared.score).toBe(100);
    expect(cleared.board[bottomRow].every((c) => c === null)).toBe(true);
  });

  it('scores more for multiple lines', () => {
    const state = createInitialState();
    const board = state.board.map((row) => [...row]);
    const rows = [TOTAL_ROWS - 1, TOTAL_ROWS - 2];
    for (const r of rows) {
      for (let c = 0; c < COLS; c++) board[r][c] = 0;
    }

    const clearingState: GameState = {
      ...state,
      board,
      status: 'clearing',
      clearingRows: rows,
      clearTimer: 0,
      activePiece: null,
      nextPieces: state.nextPieces,
    };
    const cleared = clearTick(clearingState);
    expect(cleared.linesCleared).toBe(2);
    expect(cleared.score).toBe(300);
  });
});

describe('ghost piece', () => {
  it('returns cells at the bottom position', () => {
    const state = makePlayingState();
    const ghost = getGhostPiece(state);
    expect(ghost).not.toBeNull();
    // Ghost should be below the active piece
    const activeCells = getPieceCells(state.activePiece!);
    const maxActiveRow = Math.max(...activeCells.map(([r]) => r));
    const maxGhostRow = Math.max(...ghost!.map(([r]) => r));
    expect(maxGhostRow).toBeGreaterThanOrEqual(maxActiveRow);
  });
});

describe('getDropInterval', () => {
  it('decreases with level', () => {
    expect(getDropInterval(1)).toBeGreaterThan(getDropInterval(5));
    expect(getDropInterval(5)).toBeGreaterThan(getDropInterval(10));
  });

  it('has a minimum floor', () => {
    expect(getDropInterval(100)).toBeGreaterThanOrEqual(50);
  });
});

describe('gravityTick', () => {
  it('does nothing when not playing', () => {
    const state = createInitialState();
    expect(gravityTick(state)).toBe(state);
  });
});
