import { useMemo } from 'react';
import { Box } from '@mui/material';
import { type GameState, posKey } from './wormLogic';

interface WormBoardProps {
  state: GameState;
}

// Which edges of the cell should be "open" (connected to adjacent segment)
interface SegmentEdges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

function getSegmentEdges(
  prev: { row: number; col: number } | null,
  curr: { row: number; col: number },
  next: { row: number; col: number } | null,
): SegmentEdges {
  const edges = { top: false, bottom: false, left: false, right: false };

  for (const neighbor of [prev, next]) {
    if (!neighbor) continue;
    const dr = neighbor.row - curr.row;
    const dc = neighbor.col - curr.col;
    if (dr === -1) edges.top = true;
    if (dr === 1) edges.bottom = true;
    if (dc === -1) edges.left = true;
    if (dc === 1) edges.right = true;
  }

  return edges;
}

function edgesToBorderRadius(edges: SegmentEdges): string {
  // Round corners that are NOT connected to a neighbor
  const r = '40%';
  const flat = '0';
  const tl = (!edges.top && !edges.left) ? r : flat;
  const tr = (!edges.top && !edges.right) ? r : flat;
  const bl = (!edges.bottom && !edges.left) ? r : flat;
  const br = (!edges.bottom && !edges.right) ? r : flat;
  return `${tl} ${tr} ${br} ${bl}`;
}

export function WormBoard({ state }: WormBoardProps) {
  const { gridSize, worm, direction, food, golden, skulls } = state;

  const wormMap = useMemo(() => {
    const map = new Map<string, { index: number; edges: SegmentEdges }>();
    for (let i = 0; i < worm.length; i++) {
      const prev = i > 0 ? worm[i - 1] : null;
      const next = i < worm.length - 1 ? worm[i + 1] : null;
      const edges = getSegmentEdges(prev, worm[i], next);
      map.set(posKey(worm[i]), { index: i, edges });
    }
    return map;
  }, [worm]);

  const skullSet = useMemo(
    () => new Set(skulls.map((s) => posKey(s.pos))),
    [skulls],
  );

  const cells = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const key = posKey({ row, col });
      const wormInfo = wormMap.get(key);
      const isFood = posKey(food.pos) === key;
      const isGolden = golden && posKey(golden.pos) === key;
      const isSkull = skullSet.has(key);

      cells.push(
        <div className="worm-cell" key={key}>
          {wormInfo != null && (
            <div
              className={[
                'worm-segment',
                wormInfo.index === 0 ? 'worm-head' : '',
                wormInfo.index === worm.length - 1 ? 'worm-tail' : '',
                state.status === 'playing'
                  ? wormInfo.index % 2 === 0 ? 'wiggle-a' : 'wiggle-b'
                  : '',
              ].filter(Boolean).join(' ')}
              data-dir={wormInfo.index === 0 ? direction : undefined}
              style={{ borderRadius: edgesToBorderRadius(wormInfo.edges) }}
            />
          )}
          {isFood && <span className="worm-food">{food.item.emoji}</span>}
          {isGolden && <span className="worm-food worm-golden">🌟</span>}
          {isSkull && <span className="worm-skull">💀</span>}
        </div>,
      );
    }
  }

  return (
    <Box>
      <div
        className="worm-board"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          '--grid-cols': gridSize,
          '--grid-rows': gridSize,
        } as React.CSSProperties}
      >
        {cells}
      </div>
    </Box>
  );
}
