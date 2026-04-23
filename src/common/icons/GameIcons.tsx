import type { ReactElement, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const Hex = ({
  cx,
  cy,
  s,
  ...props
}: { cx: number; cy: number; s: number } & SVGProps<SVGPolygonElement>) => {
  const h = (s * Math.sqrt(3)) / 2;
  const points = [
    [cx + s, cy],
    [cx + s / 2, cy + h],
    [cx - s / 2, cy + h],
    [cx - s, cy],
    [cx - s / 2, cy - h],
    [cx + s / 2, cy - h],
  ]
    .map((p) => p.join(','))
    .join(' ');
  return <polygon points={points} {...props} />;
};

export const WormIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    <circle cx="15" cy="80" r="8" fill="#4CAF50" />
    <circle cx="30" cy="72" r="9" fill="#66BB6A" />
    <circle cx="45" cy="77" r="10" fill="#4CAF50" />
    <circle cx="58" cy="64" r="11" fill="#66BB6A" />
    <circle cx="68" cy="48" r="14" fill="#388E3C" />
    <circle cx="74" cy="42" r="3.2" fill="#FFF" />
    <circle cx="75" cy="42" r="1.6" fill="#000" />
    <path
      d="M62 54 Q 67 59 73 54"
      stroke="#1B5E20"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="86" cy="26" r="10" fill="#E53935" />
    <circle cx="83" cy="23" r="2.5" fill="#EF9A9A" opacity="0.7" />
    <rect x="85" y="14" width="2" height="4" fill="#6D4C41" />
    <path
      d="M87 16 Q 91 13 94 17"
      stroke="#43A047"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

export const BlockBusterIcon = (props: IconProps) => {
  const brick = (x: number, y: number, w: number, fill: string) => (
    <rect x={x} y={y} width={w} height="8" fill={fill} rx="1.5" />
  );
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      {brick(8, 12, 16, '#E53935')}
      {brick(26, 12, 16, '#FB8C00')}
      {brick(62, 12, 16, '#FDD835')}
      {brick(80, 12, 12, '#E53935')}
      {brick(8, 22, 16, '#FDD835')}
      {brick(26, 22, 16, '#43A047')}
      {brick(44, 22, 16, '#1E88E5')}
      {brick(62, 22, 16, '#8E24AA')}
      {brick(80, 22, 12, '#43A047')}
      {brick(8, 32, 10, '#1E88E5')}
      {brick(20, 32, 16, '#8E24AA')}
      {brick(56, 32, 16, '#E53935')}
      {brick(74, 32, 18, '#FB8C00')}
      <circle cx="54" cy="58" r="5.5" fill="#FFEB3B" stroke="#000" strokeWidth="1.5" />
      <rect x="30" y="82" width="40" height="7" fill="#1E88E5" stroke="#0D47A1" strokeWidth="1.5" rx="3" />
    </svg>
  );
};

export const BlockPartyIcon = (props: IconProps) => {
  const cell = (x: number, y: number, fill: string) => (
    <rect x={x} y={y} width="12" height="12" rx="1" fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
  );
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      {/* Falling T piece */}
      {cell(35, 8, '#9C27B0')}
      {cell(47, 8, '#9C27B0')}
      {cell(59, 8, '#9C27B0')}
      {cell(47, 20, '#9C27B0')}
      {/* Stack: L orange */}
      {cell(5, 56, '#FF9800')}
      {cell(5, 68, '#FF9800')}
      {cell(5, 80, '#FF9800')}
      {cell(17, 80, '#FF9800')}
      {/* Stack: Square yellow */}
      {cell(33, 68, '#FFD600')}
      {cell(45, 68, '#FFD600')}
      {cell(33, 80, '#FFD600')}
      {cell(45, 80, '#FFD600')}
      {/* Stack: S green */}
      {cell(57, 68, '#43A047')}
      {cell(69, 68, '#43A047')}
      {cell(69, 80, '#43A047')}
      {cell(81, 80, '#43A047')}
    </svg>
  );
};

export const PacManIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {/* Pac-Man */}
    <path
      d="M 20 50 L 50 28 A 30 30 0 1 0 50 72 Z"
      fill="#FFEB3B"
      stroke="#000"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="16" cy="36" r="3" fill="#000" />
    {/* Dots */}
    <circle cx="62" cy="50" r="3" fill="#FFCC80" />
    <circle cx="72" cy="50" r="3" fill="#FFCC80" />
    {/* Ghost */}
    <g transform="translate(90,50)">
      <path
        d="M-13,-4 Q-13,-17 0,-17 Q13,-17 13,-4 L13,13 L9,9 L5,13 L0,9 L-5,13 L-9,9 L-13,13 Z"
        fill="#E91E63"
        stroke="#000"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="-4" cy="-6" r="3" fill="#FFF" />
      <circle cx="4" cy="-6" r="3" fill="#FFF" />
      <circle cx="-4" cy="-6" r="1.5" fill="#1E88E5" />
      <circle cx="4" cy="-6" r="1.5" fill="#1E88E5" />
    </g>
  </svg>
);

export const BeeIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {/* Outer ring */}
    <Hex cx={50} cy={27.5} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    <Hex cx={50} cy={72.5} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    <Hex cx={69.5} cy={38.75} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    <Hex cx={69.5} cy={61.25} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    <Hex cx={30.5} cy={38.75} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    <Hex cx={30.5} cy={61.25} s={13} fill="#FFF3B0" stroke="#F57F17" strokeWidth={2.5} />
    {/* Center */}
    <Hex cx={50} cy={50} s={13} fill="#FFD600" stroke="#F57F17" strokeWidth={2.5} />
    <text
      x="50"
      y="57.5"
      textAnchor="middle"
      fontSize="17"
      fontWeight="800"
      fill="#F57F17"
      fontFamily="system-ui, sans-serif"
    >
      B
    </text>
  </svg>
);

export const WordlIcon = (props: IconProps) => {
  const tile = (x: number, fill: string, letter: string, letterFill: string, stroke?: string) => (
    <g>
      <rect
        x={x}
        y="33"
        width="16"
        height="34"
        rx="2"
        fill={fill}
        stroke={stroke ?? 'none'}
        strokeWidth={stroke ? 2 : 0}
      />
      <text
        x={x + 8}
        y="57"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fill={letterFill}
        fontFamily="system-ui, sans-serif"
      >
        {letter}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      {tile(6, '#6AAA64', 'W', '#FFF')}
      {tile(24, '#C9B458', 'O', '#FFF')}
      {tile(42, '#787C7E', 'R', '#FFF')}
      {tile(60, '#FFFFFF', 'D', '#1A1A1B', '#9CA0A3')}
      {tile(78, '#FFFFFF', 'L', '#1A1A1B', '#9CA0A3')}
    </svg>
  );
};

export const RacerIcon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {/* Road */}
    <rect x="15" y="0" width="70" height="100" fill="#37474F" />
    {/* Road shoulders */}
    <rect x="13" y="0" width="2" height="100" fill="#FFEB3B" />
    <rect x="85" y="0" width="2" height="100" fill="#FFEB3B" />
    {/* Dashed center line */}
    <rect x="49" y="4" width="2" height="12" fill="#FFF" />
    <rect x="49" y="22" width="2" height="12" fill="#FFF" />
    <rect x="49" y="40" width="2" height="12" fill="#FFF" />
    <rect x="49" y="58" width="2" height="12" fill="#FFF" />
    <rect x="49" y="76" width="2" height="12" fill="#FFF" />
    {/* Cone obstacle */}
    <polygon points="68,18 61,34 75,34" fill="#FF6F00" stroke="#B23C00" strokeWidth="1.5" />
    <rect x="59" y="33" width="18" height="4" fill="#FF6F00" stroke="#B23C00" strokeWidth="1.5" rx="1" />
    <rect x="65" y="24" width="6" height="2" fill="#FFF" />
    {/* Player car */}
    <g transform="translate(30,65)">
      <rect x="-11" y="-17" width="22" height="34" rx="5" fill="#E53935" stroke="#000" strokeWidth="1.5" />
      <rect x="-8" y="-12" width="16" height="9" rx="1.5" fill="#B3E5FC" stroke="#0D47A1" strokeWidth="1" />
      <rect x="-8" y="3" width="16" height="6" rx="1.5" fill="#B3E5FC" stroke="#0D47A1" strokeWidth="1" />
      <rect x="-9" y="-17" width="4" height="2.5" fill="#FFEB3B" />
      <rect x="5" y="-17" width="4" height="2.5" fill="#FFEB3B" />
    </g>
    {/* Coin */}
    <circle cx="70" cy="70" r="6" fill="#FFD600" stroke="#FF8F00" strokeWidth="1.5" />
    <text
      x="70"
      y="74"
      textAnchor="middle"
      fontSize="9"
      fontWeight="800"
      fill="#B26A00"
      fontFamily="system-ui, sans-serif"
    >
      $
    </text>
  </svg>
);

export const ADHD20Icon = (props: IconProps) => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
    {/* D20 silhouette (pointy-top hexagon) */}
    <polygon
      points="50,8 87,29 87,71 50,92 13,71 13,29"
      fill="#7E57C2"
      stroke="#311B92"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Central face triangle */}
    <polygon points="50,28 72,64 28,64" fill="#B39DDB" stroke="#311B92" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Facet lines */}
    <g stroke="#311B92" strokeWidth="1.5" strokeLinecap="round">
      <line x1="50" y1="8" x2="50" y2="28" />
      <line x1="87" y1="29" x2="72" y2="64" />
      <line x1="13" y1="29" x2="28" y2="64" />
      <line x1="87" y1="71" x2="72" y2="64" />
      <line x1="13" y1="71" x2="28" y2="64" />
      <line x1="50" y1="92" x2="72" y2="64" />
      <line x1="50" y1="92" x2="28" y2="64" />
    </g>
    <text
      x="50"
      y="56"
      textAnchor="middle"
      fontSize="18"
      fontWeight="800"
      fill="#311B92"
      fontFamily="system-ui, sans-serif"
    >
      20
    </text>
  </svg>
);

export interface GameIcon {
  Component: (props: IconProps) => ReactElement;
  tint: string;
}

export const gameIcons: Record<string, GameIcon> = {
  worm: { Component: WormIcon, tint: '#66BB6A' },
  'block-buster': { Component: BlockBusterIcon, tint: '#E53935' },
  'block-party': { Component: BlockPartyIcon, tint: '#9C27B0' },
  'pac-man': { Component: PacManIcon, tint: '#FFC107' },
  bee: { Component: BeeIcon, tint: '#F57F17' },
  wordl: { Component: WordlIcon, tint: '#6AAA64' },
  racer: { Component: RacerIcon, tint: '#E53935' },
  adhd20: { Component: ADHD20Icon, tint: '#7E57C2' },
};
