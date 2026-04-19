import { Container, Typography, Box, Link } from '@mui/material';

export default function About() {
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        About
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography>
          This is a collection of arcade classics and fun apps, built in a single
          day as a hackathon project to explore what's possible with AI-assisted
          development.
        </Typography>
        <Typography>
          Every game and app was designed and coded collaboratively with{' '}
          <Link href="https://claude.ai" target="_blank" rel="noopener">
            Claude
          </Link>{' '}
          by Anthropic. The project uses React, Vite, and Material UI.
        </Typography>
        <Typography>
          Try switching themes with the dropdown in the header — each game looks
          great in Pastel, Bold, and Neon. Dark mode works across all themes too!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Built with love, caffeine, and a lot of context window.
        </Typography>
      </Box>
    </Container>
  );
}
