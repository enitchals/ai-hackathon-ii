import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  useMediaQuery,
  useTheme,
  IconButton,
  Drawer,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { GameShell, HighScore, type ScoreEntry } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
import { useAppTheme } from '../../common/themes';
import { getMaze, hasWall, WALL_TOP, WALL_RIGHT, WALL_BOTTOM, WALL_LEFT, type Direction } from './mazes';
import {
  createInitialState,
  setDirection,
  tick,
  advanceLevel,
  isScaredFlashing,
  type GameState,
} from './pacManLogic';

interface Settings {
  ghostCount: number;
}

const DEFAULT_SETTINGS: Settings = { ghostCount: 4 };

const TICK_MS = 100; // 10 ticks per second

export default function PacManGame() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { definition, darkMode } = useAppTheme();

  const [settings, setSettings] = useAppStorage<Settings>('pac-man', 'settings', DEFAULT_SETTINGS);
  const [highScores, setHighScores] = useAppStorage<ScoreEntry[]>('pac-man', 'highScores', []);
  const [showControls, setShowControls] = useAppStorage<boolean>('pac-man', 'seenControls', true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() => {
    const maze = getMaze(1);
    return createInitialState(maze, settings.ghostCount);
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(gameState);
  gameRef.current = gameState;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);

  // --- Drawing ---
  const draw = useCallback((state: GameState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    const { maze } = state;
    const cellW = (displayWidth * dpr) / maze.cols;
    const cellH = (displayHeight * dpr) / maze.rows;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Background
    const bg = darkMode ? definition.dark.bg : definition.light.bg;
    const fg = darkMode ? definition.dark.fg : definition.light.fg;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, displayWidth * dpr, displayHeight * dpr);

    // Draw maze walls as lines between cells
    ctx.strokeStyle = definition.accents[2]; // blue accent for walls
    ctx.lineWidth = Math.max(2, cellW * 0.12);
    ctx.lineCap = 'round';

    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const cell = maze.cells[r][c];
        const x = c * cellW;
        const y = r * cellH;

        // Only draw RIGHT and BOTTOM walls to avoid double-drawing
        // (TOP is drawn by the cell above, LEFT by the cell to the left)
        // Exception: first row draws TOP, first col draws LEFT
        if (r === 0 && hasWall(cell, WALL_TOP)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellW, y);
          ctx.stroke();
        }
        if (c === 0 && hasWall(cell, WALL_LEFT)) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellH);
          ctx.stroke();
        }
        if (hasWall(cell, WALL_RIGHT)) {
          ctx.beginPath();
          ctx.moveTo(x + cellW, y);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
        if (hasWall(cell, WALL_BOTTOM)) {
          ctx.beginPath();
          ctx.moveTo(x, y + cellH);
          ctx.lineTo(x + cellW, y + cellH);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const content = state.dots[r]?.[c];
        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;

        if (content === 'dot') {
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(2, cellW * 0.1), 0, Math.PI * 2);
          ctx.fill();
        } else if (content === 'power') {
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(cx, cy, cellW * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (content === 'fruit') {
          ctx.font = `${cellW * 0.7}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🍒', cx, cy);
        }
      }
    }

    // Draw ghosts
    const flashing = isScaredFlashing(state);
    for (const ghost of state.ghosts) {
      if (ghost.inJail && ghost.releaseTimer > 0) {
        // Draw dimmed in jail
        ctx.globalAlpha = 0.4;
      }

      const gx = ghost.pos.col * cellW + cellW / 2;
      const gy = ghost.pos.row * cellH + cellH / 2;
      const gr = cellW * 0.38;

      if (ghost.scared) {
        // Scared color — flash between blue and white
        ctx.fillStyle = flashing && state.tickCount % 4 < 2 ? '#FFFFFF' : '#5555FF';
      } else {
        ctx.fillStyle = definition.accents[ghost.colorIndex];
      }

      // Ghost body: rounded top, wavy bottom
      ctx.beginPath();
      ctx.arc(gx, gy - gr * 0.2, gr, Math.PI, 0);
      ctx.lineTo(gx + gr, gy + gr * 0.6);
      // Wavy bottom
      const waves = 3;
      const waveW = (gr * 2) / waves;
      for (let i = 0; i < waves; i++) {
        const wx = gx + gr - i * waveW;
        ctx.quadraticCurveTo(wx - waveW * 0.25, gy + gr, wx - waveW * 0.5, gy + gr * 0.6);
        ctx.quadraticCurveTo(wx - waveW * 0.75, gy + gr * 0.2, wx - waveW, gy + gr * 0.6);
      }
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#FFFFFF';
      const eyeR = gr * 0.25;
      ctx.beginPath();
      ctx.arc(gx - gr * 0.3, gy - gr * 0.2, eyeR, 0, Math.PI * 2);
      ctx.arc(gx + gr * 0.3, gy - gr * 0.2, eyeR, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (look toward movement direction)
      ctx.fillStyle = '#333';
      const pupilR = eyeR * 0.5;
      let pdx = 0, pdy = 0;
      if (ghost.direction === 'LEFT') pdx = -pupilR * 0.5;
      if (ghost.direction === 'RIGHT') pdx = pupilR * 0.5;
      if (ghost.direction === 'UP') pdy = -pupilR * 0.5;
      if (ghost.direction === 'DOWN') pdy = pupilR * 0.5;
      ctx.beginPath();
      ctx.arc(gx - gr * 0.3 + pdx, gy - gr * 0.2 + pdy, pupilR, 0, Math.PI * 2);
      ctx.arc(gx + gr * 0.3 + pdx, gy - gr * 0.2 + pdy, pupilR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // Draw Pac-Man
    const px = state.player.col * cellW + cellW / 2;
    const py = state.player.row * cellH + cellH / 2;
    const pr = cellW * 0.4;

    ctx.fillStyle = definition.accents[0]; // yellow
    const mouthAngle = state.mouthOpen ? 0.3 : 0.05;
    let startAngle = mouthAngle;
    let endAngle = Math.PI * 2 - mouthAngle;

    // Rotate mouth based on direction
    const dirAngles: Record<Direction, number> = {
      RIGHT: 0,
      DOWN: Math.PI / 2,
      LEFT: Math.PI,
      UP: -Math.PI / 2,
    };
    const rotation = dirAngles[state.playerDir];
    startAngle += rotation;
    endAngle += rotation;

    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, pr, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Eye
    const eyeOffsetX = Math.cos(rotation - 0.5) * pr * 0.3;
    const eyeOffsetY = Math.sin(rotation - 0.5) * pr * 0.3;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(px + eyeOffsetX, py + eyeOffsetY, pr * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // HUD overlay
    ctx.fillStyle = fg;
    ctx.font = `${Math.max(12, cellW * 0.6)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('❤️'.repeat(state.lives), 4, 4);
    ctx.textAlign = 'right';
    ctx.fillText(`${state.score}`, displayWidth * dpr - 4, 4);

    // Idle message
    if (state.status === 'idle') {
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.7;
      ctx.font = `bold ${Math.max(14, cellW * 0.8)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        isMobile ? 'Tap to start' : 'Press an arrow key',
        (displayWidth * dpr) / 2,
        (displayHeight * dpr) / 2 + cellH * 4,
      );
      ctx.globalAlpha = 1;
    }
  }, [definition, darkMode, isMobile]);

  // --- Game loop ---
  const gameLoop = useCallback((timestamp: number) => {
    const state = gameRef.current;

    if (state.status === 'playing') {
      if (timestamp - lastTickRef.current >= TICK_MS) {
        lastTickRef.current = timestamp;
        setGameState((prev) => {
          const next = tick(prev);
          if (next.status === 'gameover') setShowGameOver(true);
          if (next.status === 'won') setShowWin(true);
          return next;
        });
      }
    }

    draw(gameRef.current);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    lastTickRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // --- Input ---
  const handleDirection = useCallback((dir: Direction) => {
    setGameState((prev) => setDirection(prev, dir));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDirection]);

  // --- Settings ---
  const resetGame = useCallback((newSettings?: Settings) => {
    const s = newSettings ?? settings;
    const maze = getMaze(1);
    setGameState(createInitialState(maze, s.ghostCount));
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    resetGame(newSettings);
  };

  // --- Score ---
  const isTopScore = gameState.score > 0 && (
    highScores.length < 3 ||
    gameState.score > Math.min(...highScores.map((s) => s.score))
  );

  const saveScore = () => {
    if (!playerName.trim()) return;
    const entry: ScoreEntry = { name: playerName.trim(), score: gameState.score, date: new Date().toISOString() };
    setHighScores([...highScores, entry].sort((a, b) => b.score - a.score).slice(0, 3));
    setPlayerName('');
    setShowGameOver(false);
    resetGame();
  };

  const dismissGameOver = () => { setShowGameOver(false); resetGame(); };

  const handleNextLevel = () => {
    setShowWin(false);
    setGameState((prev) => {
      const maze = getMaze(prev.level + 1);
      return advanceLevel(prev, maze);
    });
  };

  const settingsContent = (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Ghosts: {settings.ghostCount}
      </Typography>
      <Slider
        value={settings.ghostCount}
        onChange={(_, v) => updateSetting('ghostCount', v as number)}
        min={1}
        max={6}
        step={1}
        marks
        size="small"
      />
      <Divider />
      <HighScore scores={highScores} maxEntries={3} />
    </Box>
  );

  const aspectRatio = gameState.maze.cols / gameState.maze.rows;

  return (
    <GameShell maxWidth="md">
      <Box sx={{ display: 'flex', gap: 3, flexDirection: isMobile ? 'column' : 'row', justifyContent: 'center' }}>
        <Box sx={{ flex: '0 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: 380,
              aspectRatio: `${aspectRatio}`,
              borderRadius: 4,
              border: `2px solid ${darkMode ? definition.dark.fg : definition.light.fg}`,
            }}
          />
          {isMobile && (
            <>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gridTemplateAreas: '". up ." "left . right" ". down ."', gridTemplateColumns: 'repeat(3, 56px)', gridTemplateRows: 'repeat(3, 56px)', gap: 4, touchAction: 'manipulation', userSelect: 'none' }}>
                  <button style={{ gridArea: 'up', borderRadius: 12, background: `var(--accent-blue)`, opacity: 0.6, color: `var(--app-bg)`, fontSize: '1.3rem', border: 'none' }} onPointerDown={() => handleDirection('UP')}>▲</button>
                  <button style={{ gridArea: 'left', borderRadius: 12, background: `var(--accent-blue)`, opacity: 0.6, color: `var(--app-bg)`, fontSize: '1.3rem', border: 'none' }} onPointerDown={() => handleDirection('LEFT')}>◀</button>
                  <button style={{ gridArea: 'right', borderRadius: 12, background: `var(--accent-blue)`, opacity: 0.6, color: `var(--app-bg)`, fontSize: '1.3rem', border: 'none' }} onPointerDown={() => handleDirection('RIGHT')}>▶</button>
                  <button style={{ gridArea: 'down', borderRadius: 12, background: `var(--accent-blue)`, opacity: 0.6, color: `var(--app-bg)`, fontSize: '1.3rem', border: 'none' }} onPointerDown={() => handleDirection('DOWN')}>▼</button>
                </div>
              </Box>
              <IconButton onClick={() => setDrawerOpen(true)} size="small" sx={{ mt: 1 }}>
                <SettingsIcon />
              </IconButton>
            </>
          )}
        </Box>

        {!isMobile && (
          <Box sx={{ width: 200, flexShrink: 0 }}>
            {settingsContent}
          </Box>
        )}

        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 260 }}>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>Settings</Typography>
            {settingsContent}
          </Box>
        </Drawer>
      </Box>

      {/* Controls modal */}
      <Dialog open={showControls} onClose={() => setShowControls(false)}>
        <DialogTitle>👻 Pac-Man</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Eat all the dots while avoiding ghosts!
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Controls</Typography>
          <Typography variant="body2">
            {isMobile ? 'Use the d-pad to move.' : 'Arrow keys or WASD to move.'}
          </Typography>
          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Tips</Typography>
          <Typography variant="body2" component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Large dots make ghosts vulnerable — eat them for bonus points!</li>
              <li>Ghosts flash before returning to normal</li>
              <li>Watch for bonus fruit near the center</li>
              <li>Each ghost has a different personality</li>
            </ul>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowControls(false)} variant="contained">
            Let's go!
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
          <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Level {gameState.level}
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
              helperText="New high score! Enter your name."
            />
          )}
        </DialogContent>
        <DialogActions>
          {isTopScore ? (
            <Button onClick={saveScore} variant="contained" disabled={!playerName.trim()}>Save Score</Button>
          ) : (
            <Button onClick={dismissGameOver} variant="contained">Play Again</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Level complete */}
      <Dialog open={showWin} onClose={handleNextLevel}>
        <DialogTitle>Level {gameState.level} Complete!</DialogTitle>
        <DialogContent>
          <Typography sx={{ textAlign: 'center', my: 2 }}>Score: {gameState.score} pts</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNextLevel} variant="contained">Next Level</Button>
        </DialogActions>
      </Dialog>
    </GameShell>
  );
}
