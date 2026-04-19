/**
 * Maze data format:
 *
 * EVERY cell is a walkable path. Walls exist as borders BETWEEN cells,
 * not as cells themselves. Each cell stores a bitmask of which edges have walls:
 *
 *   bit 0 (1)  = wall on TOP edge
 *   bit 1 (2)  = wall on RIGHT edge
 *   bit 2 (4)  = wall on BOTTOM edge
 *   bit 3 (8)  = wall on LEFT edge
 *
 * A cell with value 0 has no walls (fully open intersection).
 * A cell with value 5 (0101) has walls on TOP and BOTTOM (horizontal corridor).
 *
 * Walls are SHARED between adjacent cells: if cell (r,c) has WALL_RIGHT,
 * then cell (r,c+1) must have WALL_LEFT. The build functions enforce this.
 *
 * Key constraint: NO DEAD ENDS. Every cell connects to at least 2 neighbors.
 */

export const WALL_TOP = 1;
export const WALL_RIGHT = 2;
export const WALL_BOTTOM = 4;
export const WALL_LEFT = 8;

export function hasWall(cell: number, wall: number): boolean {
  return (cell & wall) !== 0;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export const DIRECTION_TO_WALL: Record<Direction, number> = {
  UP: WALL_TOP,
  RIGHT: WALL_RIGHT,
  DOWN: WALL_BOTTOM,
  LEFT: WALL_LEFT,
};

export const OPPOSITE_DIR: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

export function moveInDirection(row: number, col: number, dir: Direction): [number, number] {
  switch (dir) {
    case 'UP': return [row - 1, col];
    case 'DOWN': return [row + 1, col];
    case 'LEFT': return [row, col - 1];
    case 'RIGHT': return [row, col + 1];
  }
}

export interface MazeData {
  rows: number;
  cols: number;
  cells: number[][]; // wall bitmask for each cell — ALL cells are paths
  playerSpawn: [number, number];
  ghostJail: [number, number][];
  powerDots: [number, number][];
  fruitSpawn: [number, number];
}

export function canMove(maze: MazeData, row: number, col: number, direction: Direction): boolean {
  if (row < 0 || row >= maze.rows || col < 0 || col >= maze.cols) return false;
  const wallFlag = DIRECTION_TO_WALL[direction];
  return !hasWall(maze.cells[row][col], wallFlag);
}

/**
 * Programmatic maze generator.
 *
 * 1. Build a spanning tree via randomized DFS (all cells connected).
 * 2. Remove every dead end by opening an extra wall.
 * 3. Carve out a ghost pen in the center.
 * 4. Place player spawn, power dots, fruit spawn.
 *
 * Uses a deterministic seeded PRNG so each seed produces the same maze.
 */
function generateMaze(rows: number, cols: number, seed: number): MazeData {
  // Seeded LCG PRNG
  let s = seed | 0;
  const rand = () => { s = (s * 16807 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const randInt = (n: number) => Math.floor(rand() * n);

  const ALL_WALLS = WALL_TOP | WALL_RIGHT | WALL_BOTTOM | WALL_LEFT;
  const cells: number[][] = Array.from({ length: rows }, () => Array(cols).fill(ALL_WALLS));

  // Open the wall between two adjacent cells
  function openBetween(r1: number, c1: number, r2: number, c2: number) {
    if (r2 === r1 + 1) { cells[r1][c1] &= ~WALL_BOTTOM; cells[r2][c2] &= ~WALL_TOP; }
    else if (r2 === r1 - 1) { cells[r1][c1] &= ~WALL_TOP; cells[r2][c2] &= ~WALL_BOTTOM; }
    else if (c2 === c1 + 1) { cells[r1][c1] &= ~WALL_RIGHT; cells[r2][c2] &= ~WALL_LEFT; }
    else if (c2 === c1 - 1) { cells[r1][c1] &= ~WALL_LEFT; cells[r2][c2] &= ~WALL_RIGHT; }
  }

  // Step 1: Randomized DFS spanning tree
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const nbrs: [number, number][] = [];
    if (r > 0 && !visited[r - 1][c]) nbrs.push([r - 1, c]);
    if (r < rows - 1 && !visited[r + 1][c]) nbrs.push([r + 1, c]);
    if (c > 0 && !visited[r][c - 1]) nbrs.push([r, c - 1]);
    if (c < cols - 1 && !visited[r][c + 1]) nbrs.push([r, c + 1]);

    if (nbrs.length === 0) {
      stack.pop();
    } else {
      const [nr, nc] = nbrs[randInt(nbrs.length)];
      openBetween(r, c, nr, nc);
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }

  // Step 2: Remove all dead ends (cells with < 2 open directions)
  const WALL_FLAGS = [WALL_TOP, WALL_RIGHT, WALL_BOTTOM, WALL_LEFT];
  const WALL_DR = [-1, 0, 1, 0];
  const WALL_DC = [0, 1, 0, -1];

  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const openCount = WALL_FLAGS.filter(w => !(cells[r][c] & w)).length;
        if (openCount >= 2) continue;

        // Find walls that can be removed (neighbor in bounds)
        const removable: number[] = [];
        for (let i = 0; i < 4; i++) {
          if (!(cells[r][c] & WALL_FLAGS[i])) continue; // already open
          const nr = r + WALL_DR[i], nc = c + WALL_DC[i];
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) removable.push(i);
        }
        if (removable.length > 0) {
          const pick = removable[randInt(removable.length)];
          openBetween(r, c, r + WALL_DR[pick], c + WALL_DC[pick]);
          changed = true;
        }
      }
    }
  }

  // Step 3: Ghost pen — 3 wide × 2 tall in center, 4 jail cells
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);

  const ghostJail: [number, number][] = [
    [cy - 1, cx - 1], [cy - 1, cx], [cy - 1, cx + 1],
    [cy, cx],
  ];

  // Open walls between adjacent jail cells
  for (const [r1, c1] of ghostJail) {
    for (const [r2, c2] of ghostJail) {
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
        openBetween(r1, c1, r2, c2);
      }
    }
  }

  // Add walls around the pen exterior (top, left, right, bottom sides)
  // Top wall of pen
  for (let dc = -1; dc <= 1; dc++) {
    const pr = cy - 1, pc = cx + dc;
    if (cy - 2 >= 0) {
      cells[pr][pc] |= WALL_TOP;
      cells[pr - 1][pc] |= WALL_BOTTOM;
    }
  }
  // Bottom wall of pen
  if (cy + 1 < rows) {
    cells[cy][cx] |= WALL_BOTTOM;
    cells[cy + 1][cx] |= WALL_TOP;
  }
  // Left wall
  if (cx - 2 >= 0) {
    cells[cy - 1][cx - 1] |= WALL_LEFT;
    cells[cy - 1][cx - 2] |= WALL_RIGHT;
  }
  // Right wall
  if (cx + 2 < cols) {
    cells[cy - 1][cx + 1] |= WALL_RIGHT;
    cells[cy - 1][cx + 2] |= WALL_LEFT;
  }
  // Left and right of bottom pen cell
  if (cx - 1 >= 0) {
    cells[cy][cx] |= WALL_LEFT;
    cells[cy][cx - 1] |= WALL_RIGHT;
  }
  if (cx + 1 < cols) {
    cells[cy][cx] |= WALL_RIGHT;
    cells[cy][cx + 1] |= WALL_LEFT;
  }

  // Pen exit: open the top of the center pen cell
  cells[cy - 1][cx] &= ~WALL_TOP;
  if (cy - 2 >= 0) cells[cy - 2][cx] &= ~WALL_BOTTOM;

  // Step 4: Fix any dead ends created by the pen walls
  changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Skip ghost jail cells
        if (ghostJail.some(([jr, jc]) => jr === r && jc === c)) continue;
        const openCount = WALL_FLAGS.filter(w => !(cells[r][c] & w)).length;
        if (openCount >= 2) continue;
        const removable: number[] = [];
        for (let i = 0; i < 4; i++) {
          if (!(cells[r][c] & WALL_FLAGS[i])) continue;
          const nr = r + WALL_DR[i], nc = c + WALL_DC[i];
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            // Don't break into jail cells
            if (!ghostJail.some(([jr, jc]) => jr === nr && jc === nc)) {
              removable.push(i);
            }
          }
        }
        if (removable.length > 0) {
          const pick = removable[randInt(removable.length)];
          openBetween(r, c, r + WALL_DR[pick], c + WALL_DC[pick]);
          changed = true;
        }
      }
    }
  }

  // Ensure outer boundary walls
  for (let c = 0; c < cols; c++) { cells[0][c] |= WALL_TOP; cells[rows - 1][c] |= WALL_BOTTOM; }
  for (let r = 0; r < rows; r++) { cells[r][0] |= WALL_LEFT; cells[r][cols - 1] |= WALL_RIGHT; }

  const playerSpawn: [number, number] = [rows - 3, cx];
  const fruitSpawn: [number, number] = [cy + 1, cx];
  const powerDots: [number, number][] = [
    [1, 1], [1, cols - 2], [rows - 2, 1], [rows - 2, cols - 2],
  ];

  return { rows, cols, cells, playerSpawn, ghostJail, powerDots, fruitSpawn };
}

function createMaze1(): MazeData { return generateMaze(17, 15, 42); }
function createMaze2(): MazeData { return generateMaze(17, 15, 137); }
function createMaze3(): MazeData { return generateMaze(17, 15, 256); }

const MAZES = [createMaze1, createMaze2, createMaze3];

export function getMaze(level: number): MazeData {
  return MAZES[(level - 1) % MAZES.length]();
}
