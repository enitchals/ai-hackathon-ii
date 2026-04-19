import { Box, Container } from '@mui/material';
import type { ReactNode } from 'react';

interface GameShellProps {
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
}

export function GameShell({ children, maxWidth = 'sm' }: GameShellProps) {
  return (
    <Container maxWidth={maxWidth}>
      <Box sx={{ py: 2 }}>{children}</Box>
    </Container>
  );
}
