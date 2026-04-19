import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { GameShell } from '../../common/components';
import {
  generatePuzzle,
  addLetter,
  removeLetter,
  clearInput,
  shuffleOuter,
  submitWord,
  getRank,
  getRankIndex,
  RANKS,
  type BeeState,
  type SubmitResult,
} from './beeLogic';
import './bee.css';

// ---------- hex tile ----------

function HexTile({
  letter,
  isCenter,
  onClick,
  style,
}: {
  letter: string;
  isCenter: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const theme = useTheme();
  const fill = isCenter
    ? 'var(--accent-yellow, #f9c74f)'
    : theme.palette.action.hover;

  return (
    <div
      className={`bee-hex${isCenter ? ' center' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      style={style}
    >
      <svg viewBox="0 0 100 115.47" xmlns="http://www.w3.org/2000/svg">
        <polygon
          points="50,0 100,28.87 100,86.6 50,115.47 0,86.6 0,28.87"
          fill={fill}
          stroke={theme.palette.divider}
          strokeWidth="2"
        />
      </svg>
      <span className="bee-hex-label">{letter}</span>
    </div>
  );
}

// ---------- toast messages ----------

const RESULT_MSG: Record<SubmitResult, string> = {
  valid: 'Nice!',
  pangram: 'PANGRAM!',
  duplicate: 'Already found',
  'too-short': 'Too short',
  'missing-center': 'Missing center letter',
  'bad-letters': 'Bad letters',
  'not-a-word': 'Not in word list',
};

function Toast({ result, id }: { result: SubmitResult; id: number }) {
  const isPangram = result === 'pangram';
  const isGood = result === 'valid' || result === 'pangram';

  return (
    <div
      key={id}
      className="bee-toast"
      style={{
        background: isPangram
          ? 'var(--accent-yellow, #f9c74f)'
          : isGood
            ? 'var(--accent-green, #90be6d)'
            : 'var(--accent-pink, #f78da7)',
        color: '#1a1a2e',
      }}
    >
      {RESULT_MSG[result]}
    </div>
  );
}

// ---------- rank bar ----------

function RankBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const rankIdx = getRankIndex(score, maxScore);
  const rankName = getRank(score, maxScore);

  return (
    <div className="bee-rank-bar">
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 80 }}>
        {rankName}
      </Typography>
      <div className="bee-rank-track">
        <div
          className="bee-rank-fill"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: 'var(--accent-yellow, #f9c74f)',
          }}
        />
        <div className="bee-rank-dots">
          {RANKS.map((r, i) => (
            <div
              key={r.name}
              className={`bee-rank-dot${i <= rankIdx ? ' reached' : ''}`}
              title={r.name}
            />
          ))}
        </div>
      </div>
      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
        {score}
      </Typography>
    </div>
  );
}

// ---------- main component ----------

export default function BeeGame() {
  const [state, setState] = useState<BeeState | null>(null);
  const [toast, setToast] = useState<{ result: SubmitResult; id: number } | null>(null);
  const [showWords, setShowWords] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastId = useRef(0);

  // Initialize puzzle
  useEffect(() => {
    // Use today's date as seed for a daily-style puzzle
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    setState(generatePuzzle(seed));
  }, []);

  const showToast = useCallback((result: SubmitResult) => {
    clearTimeout(toastTimer.current);
    toastId.current += 1;
    setToast({ result, id: toastId.current });
    toastTimer.current = setTimeout(() => setToast(null), 1200);
  }, []);

  const handleLetterClick = useCallback((letter: string) => {
    setState((s) => (s ? addLetter(s, letter) : s));
  }, []);

  const handleDelete = useCallback(() => {
    setState((s) => (s ? removeLetter(s) : s));
  }, []);

  const handleClear = useCallback(() => {
    setState((s) => (s ? clearInput(s) : s));
  }, []);

  const handleShuffle = useCallback(() => {
    setState((s) => (s ? shuffleOuter(s) : s));
  }, []);

  const handleSubmit = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.currentInput.length === 0) return prev;
      const { state: next, result } = submitWord(prev);
      showToast(result);
      return next;
    });
  }, [showToast]);

  const handleNewPuzzle = useCallback(() => {
    setState(generatePuzzle());
    setShowWords(false);
  }, []);

  // Keyboard handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!state) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const letter = e.key.toLowerCase();
        if (state.letters.includes(letter)) {
          handleLetterClick(letter);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state, handleSubmit, handleDelete, handleClear, handleLetterClick]);

  if (!state) return null;

  const { letters, centerLetter, currentInput, score, maxScore, foundWords, validWords, pangrams } = state;

  // Pointy-top hex honeycomb: center + 6 surrounding positions.
  // For pointy-top, neighbor offsets (in hex-width / hex-height units):
  //   top:         ( 0,   -0.75)
  //   top-right:   (+0.5, -0.375) -- wait, need real geometry
  // Pointy-top hex: width W, height H = W * 2/sqrt(3).
  // Center-to-center distance = H * 3/4 vertically for same-column,
  // and W horizontally + H/4 vertically for adjacent columns.
  // Positions relative to center (in multiples of W and row-step):
  //   index 0 = center
  //   index 1 = top-left,  index 2 = top-right
  //   index 3 = left,      index 4 = right
  //   index 5 = bot-left,  index 6 = bot-right
  const hexPositions: [number, number][] = [
    [0, 0],        // center
    [-0.5, -1],    // top-left
    [0.5, -1],     // top-right
    [-1, 0],       // left
    [1, 0],        // right
    [-0.5, 1],     // bottom-left
    [0.5, 1],      // bottom-right
  ];

  return (
    <GameShell maxWidth="xs">
      {/* Score and rank */}
      <RankBar score={score} maxScore={maxScore} />

      <Divider sx={{ my: 1 }} />

      {/* Input display */}
      <Box sx={{ position: 'relative', minHeight: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {toast && <Toast result={toast.result} id={toast.id} />}
        <div className="bee-input-display">
          {currentInput.split('').map((ch, i) => (
            <span
              key={i}
              style={{
                color: ch === centerLetter
                  ? 'var(--accent-yellow, #f9c74f)'
                  : !letters.includes(ch)
                    ? 'var(--accent-pink, #f78da7)'
                    : undefined,
              }}
            >
              {ch}
            </span>
          ))}
          <span className="bee-input-cursor" />
        </div>
      </Box>

      {/* Hex grid */}
      <Box sx={{ py: 2 }}>
        <div className="bee-hex-grid">
          {letters.map((l, i) => {
            const [cx, cy] = hexPositions[i];
            return (
              <HexTile
                key={l}
                letter={l}
                isCenter={i === 0}
                onClick={() => handleLetterClick(l)}
                style={{
                  left: `calc(50% + ${cx} * (var(--hex-w) + 4px) - var(--hex-w) / 2)`,
                  top: `calc(50% + ${cy} * var(--row-step) - var(--hex-h) / 2)`,
                }}
              />
            );
          })}
        </div>
      </Box>

      {/* Controls */}
      <div className="bee-controls">
        <Button variant="outlined" size="small" onClick={handleDelete}>
          Delete
        </Button>
        <Button variant="outlined" size="small" onClick={handleShuffle}>
          Shuffle
        </Button>
        <Button variant="contained" size="small" onClick={handleSubmit}>
          Enter
        </Button>
      </div>

      <Divider sx={{ my: 2 }} />

      {/* Found words */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {foundWords.length} word{foundWords.length !== 1 ? 's' : ''} found
        </Typography>
        <Button size="small" onClick={() => setShowWords(!showWords)}>
          {showWords ? 'Hide' : 'Show'}
        </Button>
      </Box>

      {showWords && (
        <div className="bee-found-words">
          {foundWords.map((w) => (
            <span key={w} className={`bee-found-word${pangrams.includes(w) ? ' pangram' : ''}`}>
              {w}
            </span>
          ))}
        </div>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Stats and new puzzle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {validWords.length} possible words ({pangrams.length} pangram{pangrams.length !== 1 ? 's' : ''})
        </Typography>
        <Button size="small" variant="outlined" onClick={handleNewPuzzle}>
          New Puzzle
        </Button>
      </Box>
    </GameShell>
  );
}
