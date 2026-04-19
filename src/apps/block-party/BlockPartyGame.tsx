import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { GameShell, HighScore, type ScoreEntry } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
import { useAppTheme } from '../../common/themes';
import {
  COLS,
  BUFFER_ROWS,
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
  getPreviewCells,
  getDropInterval,
  type GameState,
} from './blockPartyLogic';
import './block-party.css';

export default function BlockPartyGame() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { definition } = useAppTheme();

  const [highScores, setHighScores] = useAppStorage<ScoreEntry[]>('block-party', 'highScores', []);
  const [showControls, setShowControls] = useAppStorage<boolean>('block-party', 'seenControls', true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const gameRef = useRef(gameState);
  gameRef.current = gameState;
  const rafRef = useRef(0);
  const lastGravityRef = useRef(0);
  const lastClearRef = useRef(0);

  // --- Game loop ---
  const gameLoop = useCallback((timestamp: number) => {
    const state = gameRef.current;

    if (state.status === 'playing') {
      const interval = getDropInterval(state.level);
      if (timestamp - lastGravityRef.current >= interval) {
        lastGravityRef.current = timestamp;
        setGameState((prev) => {
          const next = gravityTick(prev);
          if (next.status === 'gameover') setShowGameOver(true);
          return next;
        });
      }
    } else if (state.status === 'clearing') {
      if (timestamp - lastClearRef.current >= 80) {
        lastClearRef.current = timestamp;
        setGameState((prev) => {
          const next = clearTick(prev);
          if (next.status === 'gameover') setShowGameOver(true);
          return next;
        });
      }
    }

    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    lastGravityRef.current = performance.now();
    lastClearRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // --- Input ---
  const handleAction = useCallback((action: string) => {
    setGameState((prev) => {
      if (prev.status === 'idle') {
        if (action === 'start') return startGame(prev);
        return prev;
      }
      if (prev.status !== 'playing') return prev;

      let next: GameState;
      switch (action) {
        case 'left': next = moveLeft(prev); break;
        case 'right': next = moveRight(prev); break;
        case 'down': next = softDrop(prev); break;
        case 'drop': next = hardDrop(prev); break;
        case 'rotateCW': next = rotateCW(prev); break;
        case 'rotateCCW': next = rotateCCW(prev); break;
        default: return prev;
      }
      if (next.status === 'gameover') setShowGameOver(true);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, string> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'down',
        ArrowUp: 'rotateCW',
        z: 'rotateCCW',
        Z: 'rotateCCW',
        ' ': 'drop',
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        if (gameRef.current.status === 'idle') {
          handleAction('start');
          return; // don't also execute the action (e.g., hard drop)
        }
        handleAction(action);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAction]);

  // --- Derived rendering data ---
  const activeCells = useMemo(() => {
    if (!gameState.activePiece) return new Map<string, number>();
    const cells = getPieceCells(gameState.activePiece);
    const map = new Map<string, number>();
    for (const [r, c] of cells) {
      map.set(`${r},${c}`, gameState.activePiece.shape.colorIndex);
    }
    return map;
  }, [gameState.activePiece]);

  const ghostCells = useMemo(() => {
    const ghost = getGhostPiece(gameState);
    return ghost ? new Set(ghost.map(([r, c]) => `${r},${c}`)) : new Set<string>();
  }, [gameState]);

  const clearingSet = useMemo(
    () => new Set(gameState.clearingRows),
    [gameState.clearingRows],
  );

  // --- Score ---
  const isTopScore = gameState.score > 0 && (
    highScores.length < 3 ||
    gameState.score > Math.min(...highScores.map((s) => s.score))
  );

  const saveScore = () => {
    if (!playerName.trim()) return;
    const entry: ScoreEntry = {
      name: playerName.trim(),
      score: gameState.score,
      date: new Date().toISOString(),
    };
    setHighScores([...highScores, entry].sort((a, b) => b.score - a.score).slice(0, 3));
    setPlayerName('');
    setShowGameOver(false);
    setGameState(createInitialState());
  };

  const dismissGameOver = () => {
    setShowGameOver(false);
    setGameState(createInitialState());
  };

  // --- Render board cells (visible rows only) ---
  const boardCells = [];
  for (let r = BUFFER_ROWS; r < TOTAL_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = `${r},${c}`;
      const boardColor = gameState.board[r][c];
      const activeColor = activeCells.get(key);
      const isGhost = ghostCells.has(key) && activeColor === undefined && boardColor === null;
      const isClearing = clearingSet.has(r) && boardColor !== null;

      let colorIndex: number | null = null;
      if (activeColor !== undefined) colorIndex = activeColor;
      else if (boardColor !== null) colorIndex = boardColor;

      const ghostColorIndex = gameState.activePiece?.shape.colorIndex;

      boardCells.push(
        <div
          key={key}
          className={[
            'bp-cell',
            colorIndex !== null ? 'bp-cell-filled' : '',
            isGhost ? 'bp-cell-ghost' : '',
            isClearing ? 'bp-cell-clearing' : '',
          ].filter(Boolean).join(' ')}
          style={{
            backgroundColor: colorIndex !== null
              ? definition.accents[colorIndex]
              : undefined,
            borderColor: isGhost && ghostColorIndex !== undefined
              ? definition.accents[ghostColorIndex]
              : undefined,
          }}
        />,
      );
    }
  }

  // --- Render previews ---
  const previews = gameState.nextPieces.map((shape, pi) => {
    const cells = getPreviewCells(shape);
    const cellSet = new Map<string, number>();
    for (const [r, c] of cells) cellSet.set(`${r},${c}`, shape.colorIndex);

    const previewCells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const ci = cellSet.get(`${r},${c}`);
        previewCells.push(
          <div
            key={`${r},${c}`}
            className={`bp-preview-cell ${ci !== undefined ? 'bp-preview-filled' : ''}`}
            style={{
              backgroundColor: ci !== undefined ? definition.accents[ci] : 'transparent',
            }}
          />,
        );
      }
    }
    return (
      <div key={pi} className="bp-preview">
        {previewCells}
      </div>
    );
  });

  return (
    <GameShell maxWidth="md">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="bp-container">
          {/* Board */}
          <div className="bp-board">
            {boardCells}
          </div>

          {/* Side panel */}
          <div className="bp-side" style={{ '--cell-size': 'clamp(16px, 4.5vw, 28px)' } as React.CSSProperties}>
            <div>
              <Typography variant="caption" color="text.secondary">NEXT</Typography>
              {previews}
            </div>

            <div className="bp-stat">
              <Typography variant="caption" color="text.secondary">SCORE</Typography>
              <div className="bp-stat-value">{gameState.score}</div>
            </div>

            <div className="bp-stat">
              <Typography variant="caption" color="text.secondary">LINES</Typography>
              <div className="bp-stat-value">{gameState.linesCleared}</div>
            </div>

            <div className="bp-stat">
              <Typography variant="caption" color="text.secondary">LEVEL</Typography>
              <div className="bp-stat-value">{gameState.level}</div>
            </div>

            {!isMobile && <HighScore scores={highScores} maxEntries={3} />}
          </div>
        </div>

        {/* Idle overlay */}
        {gameState.status === 'idle' && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, textAlign: 'center' }}
          >
            {isMobile ? 'Tap a control to start' : 'Press any key to start'}
          </Typography>
        )}

        {/* Mobile controls */}
        {isMobile && (
          <div className="bp-controls">
            <button className="bp-ctrl-btn" onPointerDown={() => handleAction('left')}>◀</button>
            <button className="bp-ctrl-btn" onPointerDown={() => handleAction('rotateCCW')}>↶</button>
            <button className="bp-ctrl-btn" onPointerDown={() => handleAction('down')}>▼</button>
            <button className="bp-ctrl-btn" onPointerDown={() => handleAction('rotateCW')}>↷</button>
            <button className="bp-ctrl-btn" onPointerDown={() => handleAction('right')}>▶</button>
            <button
              className="bp-ctrl-btn bp-ctrl-btn-wide"
              onPointerDown={() => {
                if (gameRef.current.status === 'idle') handleAction('start');
                handleAction('drop');
              }}
            >
              DROP
            </button>
          </div>
        )}
      </Box>

      {/* Controls modal */}
      <Dialog open={showControls} onClose={() => setShowControls(false)}>
        <DialogTitle>🎉 Block Party</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Stack falling blocks to complete rows. Clear lines to score!
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Controls</Typography>
          {isMobile ? (
            <Typography variant="body2">
              Use the <strong>on-screen buttons</strong> to move, rotate, and drop pieces.
            </Typography>
          ) : (
            <Typography variant="body2" component="div">
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li><strong>←/→</strong> — Move left/right</li>
                <li><strong>↑</strong> — Rotate clockwise</li>
                <li><strong>Z</strong> — Rotate counter-clockwise</li>
                <li><strong>↓</strong> — Soft drop</li>
                <li><strong>Space</strong> — Hard drop</li>
              </ul>
            </Typography>
          )}
          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Scoring</Typography>
          <Typography variant="body2">
            1 line = 100 · 2 lines = 300 · 3 lines = 500 · 4 lines = 800
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowControls(false)} variant="contained">
            Let's party!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game over */}
      <Dialog open={showGameOver} onClose={dismissGameOver}>
        <DialogTitle>Game Over!</DialogTitle>
        <DialogContent>
          <Typography variant="h4" sx={{ textAlign: 'center', my: 2 }}>
            {gameState.score} pts
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
            Level {gameState.level} · {gameState.linesCleared} lines cleared
          </Typography>
          {isTopScore && (
            <TextField
              label="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveScore()}
              fullWidth
              autoFocus
              size="small"
              sx={{ mt: 2 }}
              helperText="New high score! Enter your name."
            />
          )}
        </DialogContent>
        <DialogActions>
          {isTopScore ? (
            <Button onClick={saveScore} variant="contained" disabled={!playerName.trim()}>
              Save Score
            </Button>
          ) : (
            <Button onClick={dismissGameOver} variant="contained">
              Play Again
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </GameShell>
  );
}
