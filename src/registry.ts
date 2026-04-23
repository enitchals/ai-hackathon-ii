import { type ComponentType, lazy } from 'react';
import { gameIcons, type GameIcon } from './common/icons/GameIcons';

export interface AppEntry {
  id: string;
  name: string;
  description: string;
  icon: GameIcon;
  path: string;
  component: React.LazyExoticComponent<ComponentType>;
}

// Add new apps here — this is the single source of truth.
// Each app should have a default export component in its folder.
export const appRegistry: AppEntry[] = [
  {
    id: 'worm',
    name: 'Worm',
    description: 'Guide your worm to eat fruit and grow. How long can you survive?',
    icon: gameIcons.worm,
    path: 'worm',
    component: lazy(() => import('./apps/worm/WormGame')),
  },
  {
    id: 'block-buster',
    name: 'Block Buster',
    description: 'Break bricks with a bouncing ball. Be kind, rewind!',
    icon: gameIcons['block-buster'],
    path: 'block-buster',
    component: lazy(() => import('./apps/block-buster/BlockBusterGame')),
  },
  {
    id: 'block-party',
    name: 'Block Party',
    description: 'Stack falling blocks and clear lines. How long can you keep the party going?',
    icon: gameIcons['block-party'],
    path: 'block-party',
    component: lazy(() => import('./apps/block-party/BlockPartyGame')),
  },
  {
    id: 'pac-man',
    name: 'Pac-Man',
    description: 'Eat dots, avoid ghosts, and chase high scores in the classic maze game!',
    icon: gameIcons['pac-man'],
    path: 'pac-man',
    component: lazy(() => import('./apps/pac-man/PacManGame')),
  },
  {
    id: 'bee',
    name: 'Spelling Bee',
    description: 'Make words from 7 letters. Use the center letter in every word!',
    icon: gameIcons.bee,
    path: 'bee',
    component: lazy(() => import('./apps/bee/BeeGame')),
  },
  {
    id: 'wordl',
    name: 'Wordl',
    description: 'Guess the 5-letter word in 6 tries. Green, yellow, or grey — how fast can you solve it?',
    icon: gameIcons.wordl,
    path: 'wordl',
    component: lazy(() => import('./apps/wordl/WordlGame')),
  },
  {
    id: 'racer',
    name: 'Racer',
    description: 'Dodge obstacles and collect cash in this endless lane-switching road game!',
    icon: gameIcons.racer,
    path: 'racer',
    component: lazy(() => import('./apps/racer/RacerGame')),
  },
  {
    id: 'adhd20',
    name: 'ADHD20',
    description: 'Roll a D20 to pick your next task. Gamify your to-do list!',
    icon: gameIcons.adhd20,
    path: 'adhd20',
    component: lazy(() => import('./apps/adhd20/ADHD20Game')),
  },
];
