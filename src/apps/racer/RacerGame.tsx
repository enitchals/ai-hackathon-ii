import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { GameShell } from '../../common/components';
import { HighScore, type ScoreEntry } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
import {
  createInitialState,
  moveLeft,
  moveRight,
  startGame,
  tick,
  LANE_COUNT,
  SPEED_PPS,
  ITEM_EMOJI,
  type RacerState,
  type SpeedSetting,
  type ObstacleSetting,
} from './racerLogic';
import './racer.css';

const CANVAS_W = 360;
const CANVAS_H = 600;
const ROAD_MARGIN = 20;
const ROAD_W = CANVAS_W - ROAD_MARGIN * 2;
const LANE_W = ROAD_W / LANE_COUNT;
const PLAYER_Y = 0.85;
const DASH_LEN = 30;
const DASH_GAP = 20;
const CAR_EMOJI = '🏎️';
const ITEM_SIZE = 28;

// ---------- drawing ----------

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: RacerState,
  lineOffset: number,
) {
  const { width: w, height: h } = ctx.canvas;
  const dpr = window.devicePixelRatio || 1;
  const cw = w / dpr;
  const ch = h / dpr;

  ctx.save();
  ctx.scale(dpr, dpr);

  // Road background
  ctx.fillStyle = '#333';
  ctx.fillRect(0, 0, cw, ch);

  // Road surface (slightly lighter)
  ctx.fillStyle = '#444';
  ctx.fillRect(ROAD_MARGIN, 0, ROAD_W, ch);

  // Road edges (solid white lines)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ROAD_MARGIN, 0);
  ctx.lineTo(ROAD_MARGIN, ch);
  ctx.moveTo(ROAD_MARGIN + ROAD_W, 0);
  ctx.lineTo(ROAD_MARGIN + ROAD_W, ch);
  ctx.stroke();

  // Lane dividers (dashed, scrolling)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([DASH_LEN, DASH_GAP]);
  ctx.lineDashOffset = -lineOffset;
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = ROAD_MARGIN + i * LANE_W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ch);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Items
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${ITEM_SIZE}px serif`;
  for (const item of state.items) {
    const x = ROAD_MARGIN + (item.lane + 0.5) * LANE_W;
    const y = item.y * ch;
    ctx.fillText(ITEM_EMOJI[item.type], x, y);
  }

  // Player car
  const playerX = ROAD_MARGIN + (state.lane + 0.5) * LANE_W;
  const playerYPx = PLAYER_Y * ch;
  ctx.font = `${ITEM_SIZE + 4}px serif`;
  ctx.fillText(CAR_EMOJI, playerX, playerYPx);

  ctx.restore();
}

// ---------- component ----------

export default function RacerGame() {
  const [state, setState] = useState<RacerState>(() => createInitialState());
  const [speed, setSpeed] = useAppStorage<SpeedSetting>('racer', 'speed', 'medium');
  const [obstacles, setObstacles] = useAppStorage<ObstacleSetting>('racer', 'obstacles', 'some');
  const [highScores, setHighScores] = useAppStorage<ScoreEntry[]>('racer', 'highScores', []);
  const [showGameOver, setShowGameOver] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const lineOffsetRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);

  stateRef.current = state;

  // Reset game with current settings
  const resetGame = useCallback(() => {
    setState(createInitialState(speed, obstacles));
    lineOffsetRef.current = 0;
    setShowGameOver(false);
  }, [speed, obstacles]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;

    lastTimeRef.current = 0;

    function loop(time: number) {
      rafRef.current = requestAnimationFrame(loop);

      if (lastTimeRef.current === 0) {
        lastTimeRef.current = time;
        drawGame(ctx!, stateRef.current, lineOffsetRef.current);
        return;
      }

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      const current = stateRef.current;

      if (current.status === 'playing') {
        const pps = SPEED_PPS[current.speed];
        lineOffsetRef.current = (lineOffsetRef.current + pps * dt) % (DASH_LEN + DASH_GAP);

        const { state: next, crashed } = tick(current, dt);
        stateRef.current = next;
        setState(next);

        if (crashed) {
          setShowGameOver(true);
        }
      }

      drawGame(ctx!, stateRef.current, lineOffsetRef.current);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Keyboard input
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        setState((s) => moveLeft(s));
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        setState((s) => moveRight(s));
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setState((s) => {
          if (s.status === 'idle') return startGame(s);
          return s;
        });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Check if score qualifies for high score
  const qualifies = state.status === 'crashed' &&
    (highScores.length < 3 || state.score > (highScores[highScores.length - 1]?.score ?? 0));

  const handleSaveScore = useCallback(() => {
    const name = nameInput.trim() || 'Player';
    setHighScores((prev) => {
      const entry: ScoreEntry = { name, score: state.score, date: new Date().toISOString() };
      return [...prev, entry].sort((a, b) => b.score - a.score).slice(0, 3);
    });
    setShowGameOver(false);
  }, [nameInput, state.score, setHighScores]);

  return (
    <GameShell maxWidth="sm">
      {/* HUD */}
      <div className="racer-hud">
        <Typography className="racer-score">
          Score: {state.score}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {state.status === 'idle' ? 'Press ← → to start' : state.status === 'crashed' ? 'Crashed!' : ''}
        </Typography>
      </div>

      {/* Canvas */}
      <div className="racer-wrapper">
        <canvas ref={canvasRef} className="racer-canvas" />

        {/* Idle overlay */}
        {state.status === 'idle' && (
          <div className="racer-overlay">
            <div className="racer-overlay-title">🏎️ Racer</div>
            <div className="racer-overlay-sub">Press ← → or tap to start</div>
            <Button
              variant="contained"
              onClick={() => setState((s) => startGame(s))}
            >
              Start
            </Button>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="racer-controls">
        <button
          className="racer-lane-btn"
          onClick={() => setState((s) => s.status === 'idle' ? startGame(moveLeft(s)) : moveLeft(s))}
        >
          ◀
        </button>
        <button
          className="racer-lane-btn"
          onClick={() => setState((s) => s.status === 'idle' ? startGame(moveRight(s)) : moveRight(s))}
        >
          ▶
        </button>
      </div>

      <Divider sx={{ my: 1 }} />

      {/* Settings */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Speed</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={speed}
            onChange={(_, v) => { if (v) { setSpeed(v); if (state.status !== 'playing') resetGame(); } }}
          >
            <ToggleButton value="slow">Slow</ToggleButton>
            <ToggleButton value="medium">Med</ToggleButton>
            <ToggleButton value="fast">Fast</ToggleButton>
            <ToggleButton value="lightning">⚡</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Obstacles</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={obstacles}
            onChange={(_, v) => { if (v) { setObstacles(v); if (state.status !== 'playing') resetGame(); } }}
          >
            <ToggleButton value="none">None</ToggleButton>
            <ToggleButton value="some">Some</ToggleButton>
            <ToggleButton value="lots">Lots</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* High scores */}
      <HighScore scores={highScores} />

      {/* New game button */}
      {state.status === 'crashed' && !showGameOver && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Button variant="contained" onClick={resetGame}>
            Play Again
          </Button>
        </Box>
      )}

      {/* Game over dialog */}
      <Dialog open={showGameOver && qualifies} onClose={() => setShowGameOver(false)}>
        <DialogTitle>High Score!</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Score: {state.score}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScore(); }}
            slotProps={{ htmlInput: { maxLength: 20 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowGameOver(false); resetGame(); }}>Skip</Button>
          <Button variant="contained" onClick={() => { handleSaveScore(); resetGame(); }}>Save</Button>
        </DialogActions>
      </Dialog>
    </GameShell>
  );
}
