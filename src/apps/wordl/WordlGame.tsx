import { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Typography, Button, Divider } from '@mui/material';
import { GameShell } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
import {
  createGame,
  addLetter,
  removeLetter,
  submitGuess,
  getKeyboardColors,
  updateStats,
  getAverageGuesses,
  EMPTY_STATS,
  type WordlState,
  type WordlStats,
  type SubmitResult,
} from './wordlLogic';
import './wordl.css';

// ---------- keyboard layout ----------

const KB_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'del'],
];

// ---------- toast messages ----------

const TOAST_MSG: Partial<Record<SubmitResult, string>> = {
  'not-a-word': 'Not in word list',
  'too-short': 'Not enough letters',
};

const WIN_MSGS = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];

// ---------- main component ----------

export default function WordlGame() {
  const [game, setGame] = useState<WordlState>(() => createGame());
  const [stats, setStats] = useAppStorage<WordlStats>('wordl', 'stats', EMPTY_STATS);
  const [toast, setToast] = useState<string | null>(null);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((msg: string, duration = 1500) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // Update stats when game ends
  useEffect(() => {
    if (game.status !== 'playing' && !statsUpdated) {
      setStats((prev) => updateStats(prev, game));
      setStatsUpdated(true);
      if (game.status === 'won') {
        showToast(WIN_MSGS[Math.min(game.guesses.length - 1, 5)]);
      } else {
        showToast(game.answer.toUpperCase(), 3000);
      }
    }
  }, [game.status, statsUpdated, game, setStats, showToast]);

  const handleKey = useCallback((key: string) => {
    setGame((prev) => {
      if (key === 'enter') {
        if (prev.status !== 'playing') return prev;
        const { state, result } = submitGuess(prev);
        const msg = TOAST_MSG[result];
        if (msg) showToast(msg);
        return state;
      }
      if (key === 'del') return removeLetter(prev);
      return addLetter(prev, key);
    });
  }, [showToast]);

  // Physical keyboard handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleKey('enter');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKey('del');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKey(e.key.toLowerCase());
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKey]);

  const handleNewGame = useCallback(() => {
    setGame(createGame());
    setStatsUpdated(false);
  }, []);

  const keyColors = getKeyboardColors(game.guesses);

  return (
    <GameShell maxWidth="xs">
      {/* Toast */}
      {toast && <div className="wordl-toast">{toast}</div>}

      {/* Board */}
      <div className="wordl-board">
        {Array.from({ length: game.maxGuesses }, (_, rowIdx) => {
          const guess = game.guesses[rowIdx];
          const isCurrentRow = rowIdx === game.guesses.length && game.status === 'playing';
          const currentInput = isCurrentRow ? game.currentInput : '';

          return (
            <div key={rowIdx} className="wordl-row">
              {Array.from({ length: 5 }, (_, colIdx) => {
                let letter = '';
                let resultClass = '';

                if (guess) {
                  letter = guess.word[colIdx];
                  resultClass = guess.results[colIdx];
                } else if (isCurrentRow && colIdx < currentInput.length) {
                  letter = currentInput[colIdx];
                  resultClass = 'filled';
                }

                return (
                  <div key={colIdx} className={`wordl-cell ${resultClass}`}>
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On-screen keyboard */}
      <div className="wordl-keyboard">
        {KB_ROWS.map((row, ri) => (
          <div key={ri} className="wordl-kb-row">
            {row.map((key) => {
              const isSpecial = key === 'enter' || key === 'del';
              const color = !isSpecial ? keyColors.get(key) : undefined;
              return (
                <button
                  key={key}
                  className={`wordl-key${isSpecial ? ' wide' : ''} ${color ?? ''}`}
                  onClick={() => handleKey(key)}
                >
                  {key === 'del' ? '⌫' : key}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Answer reveal on loss */}
      {game.status === 'lost' && (
        <Typography
          variant="body1"
          sx={{ textAlign: 'center', fontWeight: 700, py: 1, textTransform: 'uppercase', letterSpacing: '0.15em' }}
        >
          The word was: {game.answer}
        </Typography>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Stats */}
      <div className="wordl-stats">
        <StatBox value={stats.gamesPlayed} label="Played" />
        <StatBox
          value={stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0}
          label="Win %"
        />
        <StatBox value={stats.currentStreak} label="Streak" />
        <StatBox value={stats.maxStreak} label="Max Streak" />
        <StatBox
          value={stats.gamesWon > 0 ? getAverageGuesses(stats).toFixed(1) : '–'}
          label="Avg Guesses"
        />
      </div>

      {/* Guess distribution */}
      {stats.gamesPlayed > 0 && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center', mt: 1 }}>
            Guess Distribution
          </Typography>
          <div className="wordl-dist">
            {stats.guessDistribution.map((count, i) => {
              const maxCount = Math.max(...stats.guessDistribution, 1);
              const isLast = game.status === 'won' && game.guesses.length === i + 1;
              return (
                <div key={i} className="wordl-dist-row">
                  <span className="wordl-dist-label">{i + 1}</span>
                  <div
                    className="wordl-dist-bar"
                    style={{
                      width: `${Math.max((count / maxCount) * 100, 8)}%`,
                      background: isLast
                        ? 'var(--wordl-correct, #6aaa64)'
                        : 'var(--wordl-absent, #787c7e)',
                    }}
                  >
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* New game button */}
      {game.status !== 'playing' && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
          <Button variant="contained" onClick={handleNewGame}>
            New Game
          </Button>
        </Box>
      )}
    </GameShell>
  );
}

function StatBox({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="wordl-stat">
      <div className="wordl-stat-value">{value}</div>
      <div className="wordl-stat-label">{label}</div>
    </div>
  );
}
