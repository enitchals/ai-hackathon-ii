import guessWordsRaw from './words5.txt?raw';
import answerWordsRaw from './answers.txt?raw';

// ---------- dictionary ----------
// Two word lists:
//   answers.txt — ~1000 common words for picking the secret word
//   words5.txt  — ~8500 words for validating guesses (broad acceptance)

let _guessSet: Set<string> | null = null;
let _answerList: string[] | null = null;

function getGuessSet(): Set<string> {
  if (!_guessSet) _guessSet = new Set(guessWordsRaw.trim().split('\n'));
  return _guessSet;
}

function getAnswerList(): string[] {
  if (!_answerList) _answerList = answerWordsRaw.trim().split('\n');
  return _answerList;
}

export function isValidWord(word: string): boolean {
  return getGuessSet().has(word.toLowerCase());
}

export function pickAnswer(seed?: number): string {
  const list = getAnswerList();
  const idx = seed != null
    ? ((seed % list.length) + list.length) % list.length
    : Math.floor(Math.random() * list.length);
  return list[idx];
}

// ---------- types ----------

export type LetterResult = 'correct' | 'present' | 'absent';

export interface WordlState {
  answer: string;
  guesses: GuessResult[];
  currentInput: string;
  status: 'playing' | 'won' | 'lost';
  maxGuesses: number;
}

export interface GuessResult {
  word: string;
  results: LetterResult[];
}

export type SubmitResult = 'valid' | 'won' | 'lost' | 'not-a-word' | 'too-short' | 'too-long';

export interface WordlStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[]; // index 0 = won in 1 guess, etc.
}

export const EMPTY_STATS: WordlStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
  guessDistribution: [0, 0, 0, 0, 0, 0],
};

// ---------- guess evaluation ----------

export function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const results: LetterResult[] = Array(5).fill('absent');
  const answerChars = answer.split('');
  const guessChars = guess.split('');

  // First pass: mark correct (green)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === answerChars[i]) {
      results[i] = 'correct';
      answerChars[i] = '*'; // consumed
      guessChars[i] = '!';  // matched
    }
  }

  // Second pass: mark present (yellow)
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === '!') continue; // already matched
    const idx = answerChars.indexOf(guessChars[i]);
    if (idx !== -1) {
      results[i] = 'present';
      answerChars[idx] = '*'; // consumed
    }
  }

  return results;
}

// ---------- game state ----------

export function createGame(seed?: number): WordlState {
  return {
    answer: pickAnswer(seed),
    guesses: [],
    currentInput: '',
    status: 'playing',
    maxGuesses: 6,
  };
}

export function addLetter(state: WordlState, letter: string): WordlState {
  if (state.status !== 'playing') return state;
  if (state.currentInput.length >= 5) return state;
  return { ...state, currentInput: state.currentInput + letter.toLowerCase() };
}

export function removeLetter(state: WordlState): WordlState {
  if (state.status !== 'playing') return state;
  if (state.currentInput.length === 0) return state;
  return { ...state, currentInput: state.currentInput.slice(0, -1) };
}

export function submitGuess(state: WordlState): { state: WordlState; result: SubmitResult } {
  if (state.status !== 'playing') return { state, result: 'valid' };

  const word = state.currentInput.toLowerCase();

  if (word.length < 5) return { state, result: 'too-short' };
  if (word.length > 5) return { state, result: 'too-long' };
  if (!isValidWord(word)) return { state, result: 'not-a-word' };

  const results = evaluateGuess(word, state.answer);
  const guess: GuessResult = { word, results };
  const guesses = [...state.guesses, guess];

  const won = results.every(r => r === 'correct');
  const lost = !won && guesses.length >= state.maxGuesses;

  return {
    state: {
      ...state,
      guesses,
      currentInput: '',
      status: won ? 'won' : lost ? 'lost' : 'playing',
    },
    result: won ? 'won' : lost ? 'lost' : 'valid',
  };
}

// ---------- keyboard colors ----------

export function getKeyboardColors(guesses: GuessResult[]): Map<string, LetterResult> {
  const colors = new Map<string, LetterResult>();
  for (const { word, results } of guesses) {
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const result = results[i];
      const current = colors.get(letter);
      // Priority: correct > present > absent
      if (!current || result === 'correct' || (result === 'present' && current === 'absent')) {
        colors.set(letter, result);
      }
    }
  }
  return colors;
}

// ---------- stats ----------

export function updateStats(stats: WordlStats, state: WordlState): WordlStats {
  if (state.status === 'playing') return stats;

  const won = state.status === 'won';
  const guessCount = state.guesses.length;
  const distribution = [...stats.guessDistribution];
  if (won) distribution[guessCount - 1] += 1;

  return {
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (won ? 1 : 0),
    currentStreak: won ? stats.currentStreak + 1 : 0,
    maxStreak: won ? Math.max(stats.maxStreak, stats.currentStreak + 1) : stats.maxStreak,
    guessDistribution: distribution,
  };
}

export function getAverageGuesses(stats: WordlStats): number {
  if (stats.gamesWon === 0) return 0;
  const total = stats.guessDistribution.reduce((sum, count, i) => sum + count * (i + 1), 0);
  return total / stats.gamesWon;
}
