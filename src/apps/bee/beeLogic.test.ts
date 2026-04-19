import { describe, it, expect } from 'vitest';
import {
  generatePuzzle,
  addLetter,
  removeLetter,
  clearInput,
  submitWord,
  scoreWord,
  getRank,
  getRankIndex,
  shuffleOuter,
  type BeeState,
} from './beeLogic';

function makePuzzle(): BeeState {
  return generatePuzzle(42);
}

describe('generatePuzzle', () => {
  it('produces 7 distinct letters', () => {
    const state = makePuzzle();
    expect(state.letters).toHaveLength(7);
    expect(new Set(state.letters).size).toBe(7);
  });

  it('center letter is the first letter', () => {
    const state = makePuzzle();
    expect(state.centerLetter).toBe(state.letters[0]);
  });

  it('finds valid words', () => {
    const state = makePuzzle();
    expect(state.validWords.length).toBeGreaterThan(0);
  });

  it('all valid words contain the center letter', () => {
    const state = makePuzzle();
    const center = state.centerLetter;
    for (const word of state.validWords) {
      expect(word).toContain(center);
    }
  });

  it('all valid words use only the 7 puzzle letters', () => {
    const state = makePuzzle();
    const letterSet = new Set(state.letters);
    for (const word of state.validWords) {
      for (const ch of word) {
        expect(letterSet.has(ch)).toBe(true);
      }
    }
  });

  it('all valid words are at least 4 letters', () => {
    const state = makePuzzle();
    for (const word of state.validWords) {
      expect(word.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('has at least one pangram', () => {
    const state = makePuzzle();
    expect(state.pangrams.length).toBeGreaterThan(0);
  });

  it('is deterministic with the same seed', () => {
    const a = generatePuzzle(123);
    const b = generatePuzzle(123);
    expect(a.letters).toEqual(b.letters);
    expect(a.validWords).toEqual(b.validWords);
  });

  it('maxScore is positive', () => {
    const state = makePuzzle();
    expect(state.maxScore).toBeGreaterThan(0);
  });
});

describe('addLetter / removeLetter / clearInput', () => {
  it('appends letters to input', () => {
    let state = makePuzzle();
    state = addLetter(state, 'A');
    state = addLetter(state, 'B');
    expect(state.currentInput).toBe('ab');
  });

  it('removes last letter', () => {
    let state = makePuzzle();
    state = addLetter(state, 'A');
    state = addLetter(state, 'B');
    state = removeLetter(state);
    expect(state.currentInput).toBe('a');
  });

  it('removeLetter on empty is no-op', () => {
    const state = makePuzzle();
    expect(removeLetter(state)).toBe(state);
  });

  it('clears input', () => {
    let state = makePuzzle();
    state = addLetter(state, 'A');
    state = clearInput(state);
    expect(state.currentInput).toBe('');
  });
});

describe('submitWord', () => {
  it('rejects words shorter than 4 letters', () => {
    let state = makePuzzle();
    state = { ...state, currentInput: 'abc' };
    const { result } = submitWord(state);
    expect(result).toBe('too-short');
  });

  it('rejects words missing center letter', () => {
    let state = makePuzzle();
    // Build a 4-letter input from non-center letters only
    const nonCenter = state.letters.filter(l => l !== state.centerLetter);
    const input = nonCenter.slice(0, 4).join('');
    state = { ...state, currentInput: input };
    const { result } = submitWord(state);
    expect(result).toBe('missing-center');
  });

  it('rejects words with letters not in the puzzle', () => {
    let state = makePuzzle();
    const letterSet = new Set(state.letters);
    const badLetter = 'abcdefghijklmnopqrstuvwxyz'.split('').find(l => !letterSet.has(l))!;
    state = { ...state, currentInput: state.centerLetter + badLetter + badLetter + badLetter };
    const { result } = submitWord(state);
    expect(result).toBe('bad-letters');
  });

  it('accepts valid words and scores them', () => {
    let state = makePuzzle();
    const word = state.validWords[0];
    state = { ...state, currentInput: word };
    const { state: next, result } = submitWord(state);
    expect(result === 'valid' || result === 'pangram').toBe(true);
    expect(next.foundWords).toContain(word);
    expect(next.score).toBeGreaterThan(0);
    expect(next.currentInput).toBe('');
  });

  it('rejects duplicate words', () => {
    let state = makePuzzle();
    const word = state.validWords[0];
    state = { ...state, currentInput: word };
    const { state: next } = submitWord(state);
    const { result } = submitWord({ ...next, currentInput: word });
    expect(result).toBe('duplicate');
  });
});

describe('scoreWord', () => {
  it('4-letter words score 1 point', () => {
    expect(scoreWord('test', new Set(['t', 'e', 's']))).toBe(1);
  });

  it('5+ letter words score their length', () => {
    expect(scoreWord('tests', new Set(['t', 'e', 's', 'a', 'b', 'c', 'd']))).toBe(5);
    expect(scoreWord('testing', new Set(['t', 'e', 's', 'i', 'n', 'g', 'z']))).toBe(7);
  });

  it('pangrams get +7 bonus', () => {
    const letters = new Set(['t', 'e', 's', 'i', 'n', 'g', 'a']);
    expect(scoreWord('seating', letters)).toBe(7 + 7); // 7 length + 7 bonus
  });
});

describe('getRank', () => {
  it('returns Beginner at 0', () => {
    expect(getRank(0, 100)).toBe('Beginner');
  });

  it('returns Queen Bee at max', () => {
    expect(getRank(100, 100)).toBe('Queen Bee');
  });

  it('returns intermediate ranks', () => {
    expect(getRank(50, 100)).toBe('Amazing');
    expect(getRank(70, 100)).toBe('Genius');
  });

  it('getRankIndex returns numeric index', () => {
    expect(getRankIndex(0, 100)).toBe(0);
    expect(getRankIndex(100, 100)).toBe(9);
  });
});

describe('shuffleOuter', () => {
  it('keeps center letter in place', () => {
    const state = makePuzzle();
    const shuffled = shuffleOuter(state);
    expect(shuffled.letters[0]).toBe(state.letters[0]);
    expect(new Set(shuffled.letters)).toEqual(new Set(state.letters));
  });
});
