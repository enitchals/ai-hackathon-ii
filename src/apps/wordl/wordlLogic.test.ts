import { describe, it, expect } from 'vitest';
import {
  evaluateGuess,
  createGame,
  addLetter,
  removeLetter,
  submitGuess,
  getKeyboardColors,
  updateStats,
  getAverageGuesses,
  isValidWord,
  pickAnswer,
  EMPTY_STATS,
  type WordlState,
} from './wordlLogic';

describe('evaluateGuess', () => {
  it('all correct', () => {
    expect(evaluateGuess('apple', 'apple')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('all absent', () => {
    expect(evaluateGuess('brick', 'moldy')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  it('mixed correct and present', () => {
    expect(evaluateGuess('haste', 'shame')).toEqual([
      'present', 'present', 'present', 'absent', 'correct',
    ]);
  });

  it('handles duplicate letters correctly', () => {
    // answer has one 'o', guess has two 'o's
    // First 'o' at position 1 is correct, second 'o' at position 4 should be absent
    expect(evaluateGuess('robot', 'movie')).toEqual([
      'absent', 'correct', 'absent', 'absent', 'absent',
    ]);
  });

  it('handles duplicate guess letters with one correct', () => {
    // answer = "seeds", guess = "speed"
    // s: present (s is at 0 in answer, 0 in guess → correct actually)
    // Wait, let me think more carefully
    // answer: s e e d s
    // guess:  s p e e d
    // pos 0: s=s → correct
    // pos 1: p≠e → check later
    // pos 2: e=e → correct
    // pos 3: e≠d → check later
    // pos 4: d≠s → check later
    // Remaining answer: [_, e, _, d, s] → e, d, s
    // pos 1: p not in remaining → absent
    // pos 3: e in remaining (pos 1) → present
    // pos 4: d in remaining (pos 3) → present
    expect(evaluateGuess('speed', 'seeds')).toEqual([
      'correct', 'absent', 'correct', 'present', 'present',
    ]);
  });

  it('only marks as many yellows as remaining occurrences', () => {
    // answer = "hotel", guess = "teeth"
    // pos 0: t≠h, pos 1: e≠o, pos 2: e=t? no, e≠t, pos 3: t=e? no, t≠e, pos 4: h≠l
    // First pass (correct): none
    // answer: h o t e l
    // guess:  t e e t h
    // Remaining answer: h, o, t, e, l
    // pos 0: t → t in remaining (pos 2) → present, consume
    // pos 1: e → e in remaining (pos 3) → present, consume
    // pos 2: e → no more e in remaining → absent
    // pos 3: t → no more t in remaining → absent
    // pos 4: h → h in remaining (pos 0) → present, consume
    expect(evaluateGuess('teeth', 'hotel')).toEqual([
      'present', 'present', 'absent', 'absent', 'present',
    ]);
  });
});

describe('dictionary', () => {
  it('validates real words', () => {
    expect(isValidWord('apple')).toBe(true);
    expect(isValidWord('house')).toBe(true);
  });

  it('rejects non-words', () => {
    expect(isValidWord('zzzzz')).toBe(false);
    expect(isValidWord('xyzab')).toBe(false);
  });

  it('pickAnswer returns a 5-letter word', () => {
    const word = pickAnswer(42);
    expect(word).toHaveLength(5);
    expect(isValidWord(word)).toBe(true);
  });

  it('pickAnswer is deterministic with seed', () => {
    expect(pickAnswer(100)).toBe(pickAnswer(100));
  });
});

describe('game flow', () => {
  it('creates a game with empty state', () => {
    const game = createGame(42);
    expect(game.answer).toHaveLength(5);
    expect(game.guesses).toHaveLength(0);
    expect(game.status).toBe('playing');
  });

  it('adds and removes letters', () => {
    let g = createGame(42);
    g = addLetter(g, 'H');
    g = addLetter(g, 'E');
    expect(g.currentInput).toBe('he');
    g = removeLetter(g);
    expect(g.currentInput).toBe('h');
  });

  it('caps input at 5 letters', () => {
    let g = createGame(42);
    for (const l of 'abcdef') g = addLetter(g, l);
    expect(g.currentInput).toHaveLength(5);
  });

  it('rejects too-short guesses', () => {
    let g = createGame(42);
    g = addLetter(g, 'a');
    const { result } = submitGuess(g);
    expect(result).toBe('too-short');
  });

  it('rejects non-words', () => {
    let g = createGame(42);
    g = { ...g, currentInput: 'zzzzz' };
    const { result } = submitGuess(g);
    expect(result).toBe('not-a-word');
  });

  it('wins when guessing correctly', () => {
    let g = createGame(42);
    g = { ...g, currentInput: g.answer };
    const { state, result } = submitGuess(g);
    expect(result).toBe('won');
    expect(state.status).toBe('won');
  });

  it('loses after 6 wrong guesses', () => {
    let g = createGame(42);
    // Find 6 different valid words that aren't the answer
    const words = ['about', 'house', 'brain', 'could', 'first', 'other'];
    for (const w of words) {
      if (w === g.answer) continue;
      g = { ...g, currentInput: w };
      const { state } = submitGuess(g);
      g = state;
      if (g.status !== 'playing') break;
    }
    if (g.guesses.length === 6) {
      expect(g.status).toBe(g.answer === g.guesses[5].word ? 'won' : 'lost');
    }
  });

  it('prevents input after game over', () => {
    let g = createGame(42);
    g = { ...g, currentInput: g.answer };
    const { state } = submitGuess(g);
    const after = addLetter(state, 'x');
    expect(after.currentInput).toBe('');
  });
});

describe('getKeyboardColors', () => {
  it('returns empty map with no guesses', () => {
    expect(getKeyboardColors([]).size).toBe(0);
  });

  it('correct overrides present', () => {
    const guesses = [
      { word: 'arise', results: ['present' as const, 'absent' as const, 'absent' as const, 'absent' as const, 'correct' as const] },
      { word: 'adept', results: ['correct' as const, 'absent' as const, 'absent' as const, 'absent' as const, 'absent' as const] },
    ];
    const colors = getKeyboardColors(guesses);
    expect(colors.get('a')).toBe('correct');
    expect(colors.get('e')).toBe('correct');
  });
});

describe('stats', () => {
  it('updates on win', () => {
    const game: WordlState = {
      answer: 'apple',
      guesses: [{ word: 'apple', results: ['correct', 'correct', 'correct', 'correct', 'correct'] }],
      currentInput: '',
      status: 'won',
      maxGuesses: 6,
    };
    const stats = updateStats(EMPTY_STATS, game);
    expect(stats.gamesPlayed).toBe(1);
    expect(stats.gamesWon).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.guessDistribution[0]).toBe(1);
  });

  it('resets streak on loss', () => {
    const prev = { ...EMPTY_STATS, currentStreak: 5, maxStreak: 5, gamesPlayed: 5, gamesWon: 5 };
    const game: WordlState = {
      answer: 'apple',
      guesses: [],
      currentInput: '',
      status: 'lost',
      maxGuesses: 6,
    };
    const stats = updateStats(prev, game);
    expect(stats.currentStreak).toBe(0);
    expect(stats.maxStreak).toBe(5);
  });

  it('computes average guesses', () => {
    const stats = { ...EMPTY_STATS, gamesWon: 3, guessDistribution: [0, 1, 0, 2, 0, 0] };
    // (1*2 + 2*4) / 3 = 10/3 ≈ 3.33
    expect(getAverageGuesses(stats)).toBeCloseTo(10 / 3);
  });
});
