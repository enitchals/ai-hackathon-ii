import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import type { AppEntry } from '../registry';

interface AppCardProps {
  app: AppEntry;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function AppCard({ app }: AppCardProps) {
  const navigate = useNavigate();
  const { Component: IconComponent, tint } = app.icon;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/${app.path}`)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '4 / 3',
            background: `linear-gradient(135deg, ${hexToRgba(tint, 0.18)} 0%, ${hexToRgba(tint, 0.32)} 100%)`,
            borderBottom: `1px solid ${hexToRgba(tint, 0.25)}`,
            p: 2,
          }}
        >
          <IconComponent style={{ width: '80%', height: '80%', maxWidth: 180 }} />
        </Box>
        <CardContent sx={{ flex: 1 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            {app.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {app.description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function PlaceholderCard() {
  return (
    <Card
      sx={{
        height: '100%',
        opacity: 0.5,
        border: '2px dashed',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          aspectRatio: '4 / 3',
          fontSize: '3rem',
        }}
      >
        🎮
      </Box>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary">
          More games are on the way!
        </Typography>
      </CardContent>
    </Card>
  );
}
