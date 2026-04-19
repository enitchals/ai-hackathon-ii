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
  Switch,
  FormControlLabel,
  useMediaQuery,
  useTheme,
  IconButton,
  Drawer,
  Divider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { GameShell } from '../../common/components';
import { HighScore, type ScoreEntry } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
import { WormBoard } from './WormBoard';
import { useSwipe } from './useSwipe';
import {
  createInitialState,
  tick,
  changeDirection,
  GRID_SIZES,
  SPEED_MS,
  type GameState,
  type Direction,
  type GridSizeSetting,
  type SpeedSetting,
  type SkullSetting,
} from './wormLogic';
import './worm.css';

interface WormSettings {
  gridSize: GridSizeSetting;
  speed: SpeedSetting;
  walls: boolean;
  skulls: SkullSetting;
}

const DEFAULT_SETTINGS: WormSettings = {
  gridSize: 'M',
  speed: 'medium',
  walls: true,
  skulls: 'no',
};

export default function WormGame() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [settings, setSettings] = useAppStorage<WormSettings>('worm', 'settings', DEFAULT_SETTINGS);
  const [highScores, setHighScores] = useAppStorage<ScoreEntry[]>('worm', 'highScores', []);
  const [showControls, setShowControls] = useAppStorage<boolean>('worm', 'seenControls', true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(GRID_SIZES[settings.gridSize], settings.walls, settings.skulls),
  );

  const gameRef = useRef(gameState);
  gameRef.current = gameState;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // --- Game loop with rAF ---
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const gameLoop = useCallback((timestamp: number) => {
    const state = gameRef.current;
    if (state.status !== 'playing') return;

    const interval = SPEED_MS[settingsRef.current.speed];
    if (timestamp - lastTickRef.current >= interval) {
      lastTickRef.current = timestamp;
      setGameState((prev) => {
        const next = tick(prev);
        if (next.status === 'gameover') {
          // Will show modal on next render
          return next;
        }
        return next;
      });
    }
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // Start/stop game loop
  useEffect(() => {
    if (gameState.status === 'playing') {
      lastTickRef.current = performance.now();
      rafRef.current = requestAnimationFrame(gameLoop);
    } else if (gameState.status === 'gameover') {
      setShowGameOver(true);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState.status, gameLoop]);

  // --- Input ---
  const handleDirection = useCallback((dir: Direction) => {
    setGameState((prev) => {
      if (prev.status === 'idle') {
        // Start game on first directional input
        return { ...changeDirection({ ...prev, status: 'playing' }, dir), status: 'playing' };
      }
      return changeDirection(prev, dir);
    });
  }, []);

  const startGame = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === 'idle') return { ...prev, status: 'playing' };
      return prev;
    });
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
      };

      if (e.key === ' ') {
        e.preventDefault();
        startGame();
        return;
      }

      const dir = keyMap[e.key];
      if (dir) {
        e.preventDefault();
        handleDirection(dir);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleDirection, startGame]);

  // Swipe
  const { handleTouchStart, handleTouchEnd } = useSwipe(handleDirection);

  // --- Settings changes ---
  const resetGame = useCallback(
    (newSettings?: WormSettings) => {
      const s = newSettings ?? settings;
      setGameState(createInitialState(GRID_SIZES[s.gridSize], s.walls, s.skulls));
    },
    [settings],
  );

  const updateSetting = <K extends keyof WormSettings>(key: K, value: WormSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (key === 'gridSize' || key === 'walls' || key === 'skulls') {
      resetGame(newSettings);
    }
  };

  // --- Score saving ---
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
    const updated = [...highScores, entry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    setHighScores(updated);
    setPlayerName('');
    setShowGameOver(false);
    resetGame();
  };

  const dismissGameOver = () => {
    setShowGameOver(false);
    resetGame();
  };

  // --- Settings panel content ---
  const settingsContent = (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Grid Size
      </Typography>
      <ToggleButtonGroup
        value={settings.gridSize}
        exclusive
        onChange={(_, v) => v && updateSetting('gridSize', v)}
        size="small"
        fullWidth
      >
        {Object.keys(GRID_SIZES).map((s) => (
          <ToggleButton key={s} value={s}>{s}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography variant="subtitle2" color="text.secondary">
        Speed
      </Typography>
      <ToggleButtonGroup
        value={settings.speed}
        exclusive
        onChange={(_, v) => v && updateSetting('speed', v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="slow">Slow</ToggleButton>
        <ToggleButton value="medium">Med</ToggleButton>
        <ToggleButton value="fast">Fast</ToggleButton>
        <ToggleButton value="lightning">&#9889;</ToggleButton>
      </ToggleButtonGroup>

      <FormControlLabel
        control={
          <Switch
            checked={settings.walls}
            onChange={(e) => updateSetting('walls', e.target.checked)}
          />
        }
        label="Walls"
      />

      <Typography variant="subtitle2" color="text.secondary">
        Skulls
      </Typography>
      <ToggleButtonGroup
        value={settings.skulls}
        exclusive
        onChange={(_, v) => v && updateSetting('skulls', v)}
        size="small"
        fullWidth
      >
        <ToggleButton value="no">No</ToggleButton>
        <ToggleButton value="yes">Yes</ToggleButton>
        <ToggleButton value="lots">Lots</ToggleButton>
      </ToggleButtonGroup>

      <Divider />
      <HighScore scores={highScores} maxEntries={3} />
    </Box>
  );

  return (
    <GameShell maxWidth="md">
      <Box
        sx={{ display: 'flex', gap: 3, flexDirection: isMobile ? 'column' : 'row' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main game area */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <div className="worm-score-bar">
            <span>Score: {gameState.score}</span>
            {isMobile && (
              <IconButton onClick={() => setDrawerOpen(true)} size="small">
                <SettingsIcon />
              </IconButton>
            )}
            <span>
              {gameState.status === 'idle' && (isMobile ? 'Tap to start' : 'Press Space')}
            </span>
          </div>

          <WormBoard state={gameState} />

          {/* Mobile d-pad */}
          {isMobile && (
            <div className="dpad-container">
              <button
                className="dpad-btn dpad-up"
                onPointerDown={() => handleDirection('UP')}
              >
                ▲
              </button>
              <button
                className="dpad-btn dpad-left"
                onPointerDown={() => handleDirection('LEFT')}
              >
                ◀
              </button>
              <button
                className="dpad-btn dpad-right"
                onPointerDown={() => handleDirection('RIGHT')}
              >
                ▶
              </button>
              <button
                className="dpad-btn dpad-down"
                onPointerDown={() => handleDirection('DOWN')}
              >
                ▼
              </button>
            </div>
          )}
        </Box>

        {/* Desktop sidebar */}
        {!isMobile && (
          <Box sx={{ width: 220, flexShrink: 0 }}>
            {settingsContent}
          </Box>
        )}

        {/* Mobile drawer */}
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 260 }}>
            <Typography variant="h6" sx={{ p: 2, pb: 0 }}>
              Settings
            </Typography>
            {settingsContent}
          </Box>
        </Drawer>
      </Box>

      {/* Controls modal */}
      <Dialog open={showControls} onClose={() => setShowControls(false)}>
        <DialogTitle>How to Play</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Guide your worm to eat fruit and grow as long as you can!
          </Typography>
          <Typography variant="subtitle2" gutterBottom>Controls</Typography>
          {isMobile ? (
            <Typography variant="body2">
              Use the <strong>d-pad buttons</strong> or <strong>swipe</strong> to change direction.
              Tap the d-pad to start.
            </Typography>
          ) : (
            <Typography variant="body2">
              <strong>Arrow keys</strong> or <strong>WASD</strong> to move.
              <strong> Space</strong> to start.
            </Typography>
          )}
          <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>Rules</Typography>
          <Typography variant="body2" component="div">
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>Eat fruit to grow and score points</li>
              <li>Rarer food is worth more points</li>
              <li>Watch for 🌟 golden stars — they're worth 100 pts but vanish quickly!</li>
              <li>Avoid 💀 skulls (if enabled)</li>
              <li>Don't hit the walls or yourself</li>
            </ul>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowControls(false)} variant="contained">
            Got it!
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game over modal */}
      <Dialog open={showGameOver} onClose={dismissGameOver}>
        <DialogTitle>Game Over!</DialogTitle>
        <DialogContent>
          <Typography variant="h4" sx={{ textAlign: 'center', my: 2 }}>
            {gameState.score} pts
          </Typography>
          <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            Your worm grew to {gameState.worm.length} segments
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
    </GameShell>
  );
}
