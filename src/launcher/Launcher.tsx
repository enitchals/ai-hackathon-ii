import { Container, Typography, Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { appRegistry } from '../registry';
import { AppCard, PlaceholderCard } from './AppCard';

export function Launcher() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Arcade
        </Typography>
        <Typography variant="body1" color="text.secondary">
          A collection of classic games and fun apps, built in a day with Claude.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {appRegistry.map((app) => (
          <Grid key={app.id} size={{ xs: 6, sm: 4, md: 4 }}>
            <AppCard app={app} />
          </Grid>
        ))}
        {appRegistry.length < 3 && (
          <Grid size={{ xs: 6, sm: 4, md: 4 }}>
            <PlaceholderCard />
          </Grid>
        )}
      </Grid>
    </Container>
  );
}
