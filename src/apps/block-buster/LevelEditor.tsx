import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import { useAppTheme } from '../../common/themes';
import { useAppStorage } from '../../common/hooks';
import { BRICK_COLS_COUNT } from './blockBusterLogic';

interface SavedLevel {
  name: string;
  grid: (number | null)[][];
}

interface LevelEditorProps {
  onPlay: (grid: (number | null)[][]) => void;
  onClose: () => void;
}

const EDITOR_ROWS = 10;
const COLS = BRICK_COLS_COUNT;

export function LevelEditor({ onPlay, onClose }: LevelEditorProps) {
  const { definition, darkMode } = useAppTheme();
  const [savedLevels, setSavedLevels] = useAppStorage<SavedLevel[]>('block-buster', 'customLevels', []);
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    Array.from({ length: EDITOR_ROWS }, () => Array(COLS).fill(null)),
  );
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [levelName, setLevelName] = useState('');
  const [loadIndex, setLoadIndex] = useState<number>(-1);
  const [painting, setPainting] = useState(false);

  const fg = darkMode ? definition.dark.fg : definition.light.fg;

  const toggleCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = prev[row][col] === selectedColor ? null : selectedColor;
      return next;
    });
  }, [selectedColor]);

  const paintCell = useCallback((row: number, col: number) => {
    if (!painting) return;
    setGrid((prev) => {
      if (prev[row][col] === selectedColor) return prev;
      const next = prev.map((r) => [...r]);
      next[row][col] = selectedColor;
      return next;
    });
  }, [painting, selectedColor]);

  const handleSave = () => {
    if (!levelName.trim()) return;
    const level: SavedLevel = { name: levelName.trim(), grid: grid.map((r) => [...r]) };
    setSavedLevels([...savedLevels, level]);
    setLevelName('');
  };

  const handleLoad = (index: number) => {
    if (index >= 0 && index < savedLevels.length) {
      setGrid(savedLevels[index].grid.map((r) => [...r]));
      setLoadIndex(index);
    }
  };

  const handleClear = () => {
    setGrid(Array.from({ length: EDITOR_ROWS }, () => Array(COLS).fill(null)));
  };

  const handleDelete = () => {
    if (loadIndex >= 0) {
      setSavedLevels(savedLevels.filter((_, i) => i !== loadIndex));
      setLoadIndex(-1);
      handleClear();
    }
  };

  const hasBricks = grid.some((row) => row.some((c) => c !== null));

  return (
    <Box sx={{ p: 2, maxWidth: 500, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Level Editor
      </Typography>

      {/* Color picker */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        Brick Color
      </Typography>
      <ToggleButtonGroup
        value={selectedColor}
        exclusive
        onChange={(_, v) => v !== null && setSelectedColor(v)}
        size="small"
        sx={{ mb: 2 }}
      >
        {definition.accents.map((color, i) => (
          <ToggleButton key={i} value={i} sx={{ px: 2 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: color, borderRadius: 0.5, border: `1px solid ${fg}` }} />
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {/* Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: '2px',
          border: `2px solid ${fg}`,
          borderRadius: 1,
          p: '2px',
          userSelect: 'none',
          touchAction: 'none',
          mb: 2,
        }}
        onPointerDown={() => setPainting(true)}
        onPointerUp={() => setPainting(false)}
        onPointerLeave={() => setPainting(false)}
      >
        {grid.flatMap((row, r) =>
          row.map((cell, c) => (
            <Box
              key={`${r}-${c}`}
              onPointerDown={() => toggleCell(r, c)}
              onPointerEnter={() => paintCell(r, c)}
              sx={{
                aspectRatio: '2/1',
                bgcolor: cell !== null ? definition.accents[cell] : 'transparent',
                border: `1px solid ${cell !== null ? 'transparent' : 'rgba(128,128,128,0.2)'}`,
                borderRadius: 0.5,
                cursor: 'pointer',
                transition: 'background-color 0.1s',
                '&:hover': {
                  opacity: 0.8,
                  bgcolor: cell !== null ? definition.accents[cell] : 'rgba(128,128,128,0.1)',
                },
              }}
            />
          )),
        )}
      </Box>

      {/* Actions */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" disabled={!hasBricks} onClick={() => onPlay(grid)}>
          Play Level
        </Button>
        <Button variant="outlined" onClick={handleClear}>Clear</Button>
        <Button variant="outlined" onClick={onClose}>Back</Button>
      </Stack>

      {/* Save */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Level name"
          value={levelName}
          onChange={(e) => setLevelName(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button variant="outlined" disabled={!levelName.trim() || !hasBricks} onClick={handleSave}>
          Save
        </Button>
      </Stack>

      {/* Load */}
      {savedLevels.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Select
            size="small"
            value={loadIndex}
            onChange={(e) => handleLoad(e.target.value as number)}
            sx={{ flex: 1 }}
            displayEmpty
          >
            <MenuItem value={-1} disabled>Load a level...</MenuItem>
            {savedLevels.map((l, i) => (
              <MenuItem key={i} value={i}>{l.name}</MenuItem>
            ))}
          </Select>
          <Button variant="outlined" color="error" disabled={loadIndex < 0} onClick={handleDelete}>
            Delete
          </Button>
        </Stack>
      )}
    </Box>
  );
}
