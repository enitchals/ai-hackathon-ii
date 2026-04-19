import wordsRaw from './words.txt?raw';
import seedsRaw from './seeds.txt?raw';

// ---------- dictionary ----------

let _wordSet: Set<string> | null = null;
let _seedWords: string[] | null = null;

function getWordSet(): Set<string> {
  if (!_wordSet) _wordSet = new Set(wordsRaw.trim().split('\n'));
  return _wordSet;
}

function getSeedWords(): string[] {
  if (!_seedWords) _seedWords = seedsRaw.trim().split('\n');
  return _seedWords;
}

// ---------- letter frequency for center-letter selection ----------

const LETTER_FREQ: Record<string, number> = {
  e: 13, t: 9.1, a: 8.2, o: 7.5, i: 7, n: 6.7, s: 6.3, h: 6.1, r: 6,
  d: 4.3, l: 4, c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2, g: 2, y: 2,
  p: 1.9, b: 1.5, v: 1, k: 0.8, j: 0.15, x: 0.15, q: 0.1, z: 0.07,
};

// ---------- types ----------

export interface BeeState {
  letters: string[];      // 7 letters — index 0 is the center letter
  centerLetter: string;
  validWords: string[];   // all accepted words for this puzzle
  pangrams: string[];     // words using all 7 letters
  foundWords: string[];
  currentInput: string;
  score: number;
  maxScore: number;
  status: 'playing';
}

export type SubmitResult =
  | 'valid'
  | 'pangram'
  | 'duplicate'
  | 'too-short'
  | 'missing-center'
  | 'bad-letters'
  | 'not-a-word';

export const RANKS = [
  { name: 'Beginner', pct: 0 },
  { name: 'Good Start', pct: 0.02 },
  { name: 'Moving Up', pct: 0.05 },
  { name: 'Good', pct: 0.08 },
  { name: 'Solid', pct: 0.15 },
  { name: 'Nice', pct: 0.25 },
  { name: 'Great', pct: 0.40 },
  { name: 'Amazing', pct: 0.50 },
  { name: 'Genius', pct: 0.70 },
  { name: 'Queen Bee', pct: 1.0 },
] as const;

// ---------- scoring ----------

export function scoreWord(word: string, letterSet: Set<string>): number {
  if (word.length === 4) return 1;
  const base = word.length;
  const isPangram = letterSet.size <= new Set(word).size &&
    [...letterSet].every(l => word.includes(l));
  return base + (isPangram ? 7 : 0);
}

// ---------- puzzle generation ----------

export function generatePuzzle(seed?: number): BeeState {
  const seeds = getSeedWords();
  const wordSet = getWordSet();

  // Pick a seed word
  const idx = seed != null
    ? ((seed % seeds.length) + seeds.length) % seeds.length
    : Math.floor(Math.random() * seeds.length);
  const seedWord = seeds[idx];

  // Extract 7 distinct letters
  const distinctLetters = [...new Set(seedWord)];
  const letterSet = new Set(distinctLetters);

  // Pick center letter: most common (by English frequency) among the 7
  distinctLetters.sort((a, b) => (LETTER_FREQ[b] ?? 0) - (LETTER_FREQ[a] ?? 0));
  const centerLetter = distinctLetters[0];

  // Arrange: center first, then remaining shuffled
  const outerLetters = distinctLetters.slice(1);
  for (let i = outerLetters.length - 1; i > 0; i--) {
    const j = seed != null
      ? ((seed * (i + 1) * 7 + 13) % (i + 1) + i + 1) % (i + 1)
      : Math.floor(Math.random() * (i + 1));
    [outerLetters[i], outerLetters[j]] = [outerLetters[j], outerLetters[i]];
  }
  const letters = [centerLetter, ...outerLetters];

  // Find all valid words: uses only these 7 letters, includes center letter, 4+ chars
  const validWords: string[] = [];
  const pangrams: string[] = [];
  for (const word of wordSet) {
    if (word.length < 4) continue;
    if (!word.includes(centerLetter)) continue;
    if ([...word].every(ch => letterSet.has(ch))) {
      validWords.push(word);
      if (distinctLetters.every(l => word.includes(l))) {
        pangrams.push(word);
      }
    }
  }

  validWords.sort();

  const maxScore = validWords.reduce((sum, w) => sum + scoreWord(w, letterSet), 0);

  return {
    letters,
    centerLetter,
    validWords,
    pangrams,
    foundWords: [],
    currentInput: '',
    score: 0,
    maxScore,
    status: 'playing',
  };
}

// ---------- actions ----------

export function addLetter(state: BeeState, letter: string): BeeState {
  return { ...state, currentInput: state.currentInput + letter.toLowerCase() };
}

export function removeLetter(state: BeeState): BeeState {
  if (state.currentInput.length === 0) return state;
  return { ...state, currentInput: state.currentInput.slice(0, -1) };
}

export function clearInput(state: BeeState): BeeState {
  return { ...state, currentInput: '' };
}

export function shuffleOuter(state: BeeState): BeeState {
  const outer = state.letters.slice(1);
  for (let i = outer.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [outer[i], outer[j]] = [outer[j], outer[i]];
  }
  return { ...state, letters: [state.letters[0], ...outer] };
}

export function submitWord(state: BeeState): { state: BeeState; result: SubmitResult } {
  const word = state.currentInput.toLowerCase();
  const letterSet = new Set(state.letters);

  if (word.length < 4) {
    return { state: { ...state, currentInput: '' }, result: 'too-short' };
  }
  if (!word.includes(state.centerLetter)) {
    return { state: { ...state, currentInput: '' }, result: 'missing-center' };
  }
  if (![...word].every(ch => letterSet.has(ch))) {
    return { state: { ...state, currentInput: '' }, result: 'bad-letters' };
  }
  if (state.foundWords.includes(word)) {
    return { state: { ...state, currentInput: '' }, result: 'duplicate' };
  }
  if (!state.validWords.includes(word)) {
    return { state: { ...state, currentInput: '' }, result: 'not-a-word' };
  }

  const points = scoreWord(word, letterSet);
  const isPangram = state.pangrams.includes(word);

  return {
    state: {
      ...state,
      currentInput: '',
      foundWords: [...state.foundWords, word].sort(),
      score: state.score + points,
    },
    result: isPangram ? 'pangram' : 'valid',
  };
}

// ---------- rank ----------

export function getRank(score: number, maxScore: number): string {
  if (maxScore === 0) return RANKS[0].name;
  const pct = score / maxScore;
  let rank: string = RANKS[0].name;
  for (const r of RANKS) {
    if (pct >= r.pct) rank = r.name;
  }
  return rank;
}

export function getRankIndex(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  const pct = score / maxScore;
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (pct >= RANKS[i].pct) idx = i;
  }
  return idx;
}
