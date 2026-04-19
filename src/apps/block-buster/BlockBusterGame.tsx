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
  ToggleButtonGroup,
  ToggleButton,
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
import {
  createInitialState,
  launchBall,
  movePaddle,
  tick,
  advanceLevel,
  getPatternName,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  BALL_SPEEDS,
  type GameState,
  type PaddleSize,
  type BallSpeed,
} from './blockBusterLogic';
import { LevelEditor } from './LevelEditor';

interface Settings {
  rows: number;
  paddleSize: PaddleSize;
  ballSpeed: BallSpeed;
}

const DEFAULT_SETTINGS: Settings = {
  rows: 5,
  paddleSize: 'M',
  ballSpeed: 'medium',
};

export default function BlockBusterGame() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const { definition, darkMode } = useAppTheme();

  const [settings, setSettings] = useAppStorage<Settings>('block-buster', 'settings', DEFAULT_SETTINGS);
  const [highScores, setHighScores] = useAppStorage<ScoreEntry[]>('block-buster', 'highScores', []);
  const [showControls, setShowControls] = useAppStorage<boolean>('block-buster', 'seenControls', true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(settings.rows, settings.paddleSize, 1),
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(gameState);
  gameRef.current = gameState;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const keysRef = useRef<Set<string>>(new Set());

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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const scaleX = (displayWidth * dpr) / FIELD_WIDTH;
    const scaleY = (displayHeight * dpr) / FIELD_HEIGHT;
    ctx.scale(scaleX, scaleY);

    // Background
    const bg = darkMode ? definition.dark.bg : definition.light.bg;
    const fg = darkMode ? definition.dark.fg : definition.light.fg;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Level indicator
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.4;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`NOW PLAYING: Level ${state.level} — ${getPatternName(state.level)}`, FIELD_WIDTH / 2, 16);
    ctx.globalAlpha = 1;

    // Bricks
    for (const brick of state.bricks) {
      const accent = definition.accents[brick.colorIndex];
      ctx.fillStyle = accent;
      ctx.beginPath();
      roundRect(ctx, brick.x, brick.y, brick.width, brick.height, 3);
      ctx.fill();

      // VHS scan lines
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 0.5;
      for (let ly = brick.y + 4; ly < brick.y + brick.height; ly += 4) {
        ctx.beginPath();
        ctx.moveTo(brick.x + 2, ly);
        ctx.lineTo(brick.x + brick.width - 2, ly);
        ctx.stroke();
      }

      // Multi-hit indicator
      if (brick.hits > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(brick.hits), brick.x + brick.width / 2, brick.y + brick.height / 2 + 3);
      }
    }

    // Paddle
    ctx.fillStyle = fg;
    ctx.beginPath();
    roundRect(
      ctx,
      state.paddle.x - state.paddle.width / 2,
      state.paddle.y,
      state.paddle.width,
      state.paddle.height,
      4,
    );
    ctx.fill();

    // Ball
    ctx.fillStyle = definition.accents[4]; // pink accent
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Lives
    ctx.fillStyle = fg;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('❤️'.repeat(state.lives), 8, FIELD_HEIGHT - 8);

    // Score
    ctx.textAlign = 'right';
    ctx.fillText(`${state.score} pts`, FIELD_WIDTH - 8, FIELD_HEIGHT - 8);

    // Status messages
    if (state.status === 'idle' || state.status === 'between-lives') {
      ctx.fillStyle = fg;
      ctx.globalAlpha = 0.7;
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isMobile ? 'Tap to launch' : 'Press Space to launch',
        FIELD_WIDTH / 2,
        FIELD_HEIGHT / 2 + 40,
      );
      ctx.globalAlpha = 1;
    }

    // CRT scanline overlay
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for (let sy = 0; sy < FIELD_HEIGHT; sy += 3) {
      ctx.fillRect(0, sy, FIELD_WIDTH, 1);
    }
  }, [definition, darkMode, isMobile]);

  // --- Game loop ---
  const gameLoop = useCallback((timestamp: number) => {
    const state = gameRef.current;

    if (state.status === 'playing') {
      // Paddle movement from keys
      const speed = 400; // paddle px/s
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05); // cap dt

      let paddleX = state.paddle.x;
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
        paddleX -= speed * dt;
      }
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
        paddleX += speed * dt;
      }

      let updated = movePaddle(state, paddleX);
      updated = tick(updated, dt);

      if (updated.status === 'gameover') {
        setShowGameOver(true);
      } else if (updated.status === 'won') {
        setShowWin(true);
      }

      setGameState(updated);
      draw(updated);
    } else {
      draw(state);
    }

    lastTimeRef.current = timestamp;
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [draw]);

  useEffect(() => {
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // --- Input ---
  const launch = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === 'idle' || prev.status === 'between-lives') {
        return launchBall(prev, BALL_SPEEDS[settingsRef.current.ballSpeed]);
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); launch(); return; }
      keysRef.current.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [launch]);

  // Touch/mouse drag on canvas to move paddle
  const dragging = useRef(false);
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    dragging.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD_WIDTH;
    setGameState((prev) => movePaddle(prev, x));

    // Also launch on tap if idle
    const state = gameRef.current;
    if (state.status === 'idle' || state.status === 'between-lives') {
      launch();
    }
  }, [launch]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD_WIDTH;
    setGameState((prev) => movePaddle(prev, x));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // --- Settings ---
  const resetGame = useCallback((newSettings?: Settings) => {
    const s = newSettings ?? settings;
    setGameState(createInitialState(s.rows, s.paddleSize, 1));
  }, [settings]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (key === 'rows' || key === 'paddleSize') {
      resetGame(newSettings);
    }
  };

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
    const updated = [...highScores, entry].sort((a, b) => b.score - a.score).slice(0, 3);
    setHighScores(updated);
    setPlayerName('');
    setShowGameOver(false);
    resetGame();
  };

  const dismissGameOver = () => {
    setShowGameOver(false);
    resetGame();
  };

  const handleNextLevel = () => {
    setShowWin(false);
    setGameState((prev) => advanceLevel(prev, settingsRef.current.rows, settingsRef.current.paddleSize));
  };

  // --- Settings panel ---
  const settingsContent = (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Brick Rows: {settings.rows}
      </Typography>
      <Slider
        value={settings.rows}
        onChange={(_, v) => updateSetting('rows', v as number)}
        min={3}
        max={10}
        step={1}
        marks
        size="small"
      />

      <Typography variant="subtitle2" color="text.secondary">
        Paddle Size
      </Typography>
      <ToggleButtonGroup
        value={settings.paddleSize}
        exclusive
        onChange={(_, v) => v && updateSetting('paddleSize', v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="S">S</ToggleButton>
        <ToggleButton value="M">M</ToggleButton>
        <ToggleButton value="L">L</ToggleButton>
      </ToggleButtonGroup>

      <Typography variant="subtitle2" color="text.secondary">
        Ball Speed
      </Typography>
      <ToggleButtonGroup
        value={settings.ballSpeed}
        exclusive
        onChange={(_, v) => v && updateSetting('ballSpeed', v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="slow">Slow</ToggleButton>
        <ToggleButton value="medium">Med</ToggleButton>
        <ToggleButton value="fast">Fast</ToggleButton>
        <ToggleButton value="lightning">&#9889;</ToggleButton>
      </ToggleButtonGroup>

      <Divider />
      <Button
        variant="outlined"
        size="small"
        fullWidth
        onClick={() => { setShowEditor(true); setDrawerOpen(false); }}
        sx={{ mt: 1 }}
      >
        Level Editor
      </Button>
      <Divider sx={{ mt: 1 }} />
      <HighScore scores={highScores} maxEntries={3} />
    </Box>
  );

  const handlePlayCustomLevel = (grid: (number | null)[][]) => {
    const state = createInitialState(grid.length, settings.paddleSize, 1, grid);
    setGameState(state);
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <GameShell maxWidth="md">
        <LevelEditor
          onPlay={handlePlayCustomLevel}
          onClose={() => setShowEditor(false)}
        />
      </GameShell>
    );
  }

  return (
    <GameShell maxWidth="md">
      <Box sx={{ display: 'flex', gap: 3, flexDirection: isMobile ? 'column' : 'row' }}>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{
              width: '100%',
              maxWidth: FIELD_WIDTH,
              aspectRatio: `${FIELD_WIDTH}/${FIELD_HEIGHT}`,
              borderRadius: 4,
              border: `2px solid ${darkMode ? definition.dark.fg : definition.light.fg}`,
              touchAction: 'none',
              cursor: 'none',
            }}
          />
          {isMobile && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
              <IconButton onClick={() => setDrawerOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                Drag to move paddle
              </Typography>
            </Box>
          )}
        </Box>

        {!isMobile && (
          <Box sx={{ width: 220, flexShrink: 0 }}>
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
        <DialogTitle>📼 Block Buster</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Break all the bricks to advance! Each level has a new pattern.
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Controls</Typography>
          {isMobile ? (
            <Typography variant="body2">
              <strong>Drag</strong> on the screen to move the paddle.
              <strong> Tap</strong> to launch the ball.
            </Typography>
          ) : (
            <Typography variant="body2">
              <strong>Arrow keys</strong> or <strong>A/D</strong> to move the paddle.
              <strong> Space</strong> to launch the ball.
            </Typography>
          )}
          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Rules</Typography>
          <Typography variant="body2" component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Bounce the ball off your paddle to break bricks</li>
              <li>Where the ball hits the paddle affects the bounce angle</li>
              <li>You start with 3 extra lives</li>
              <li>Clear all bricks to advance to the next level</li>
              <li>Some bricks take multiple hits on later levels</li>
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
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>
            BE KIND, REWIND
          </Typography>
          <Typography variant="h4" sx={{ textAlign: 'center', my: 2 }}>
            {gameState.score} pts
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            You reached level {gameState.level}
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

      {/* Level complete */}
      <Dialog open={showWin} onClose={handleNextLevel}>
        <DialogTitle>Level {gameState.level} Complete!</DialogTitle>
        <DialogContent>
          <Typography sx={{ textAlign: 'center', my: 2 }}>
            Score: {gameState.score} pts
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNextLevel} variant="contained">
            Next Level
          </Button>
        </DialogActions>
      </Dialog>
    </GameShell>
  );
}

// Canvas roundRect helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
