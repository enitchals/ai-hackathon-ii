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

export function AppCard({ app }: AppCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            pt: 3,
            pb: 1,
          }}
        >
          {app.icon}
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
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          pt: 3,
          pb: 1,
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
