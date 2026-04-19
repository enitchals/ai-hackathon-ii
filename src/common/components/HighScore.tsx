import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export interface ScoreEntry {
  name: string;
  score: number;
  date: string;
}

interface HighScoreProps {
  scores: ScoreEntry[];
  title?: string;
  maxEntries?: number;
}

export function HighScore({
  scores,
  title = 'High Scores',
  maxEntries = 5,
}: HighScoreProps) {
  const sorted = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, maxEntries);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EmojiEventsIcon color="warning" />
        {title}
      </Typography>
      {sorted.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No scores yet. Be the first!
        </Typography>
      ) : (
        <List dense>
          {sorted.map((entry, i) => (
            <ListItem key={`${entry.name}-${entry.date}-${i}`} disablePadding>
              <ListItemText
                primary={`${i + 1}. ${entry.name}`}
                secondary={`${entry.score.toLocaleString()} pts`}
                slotProps={{
                  primary: {
                    sx: { fontWeight: i === 0 ? 700 : 400 },
                  },
                }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
