import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { AppHeader } from './AppHeader';

export function Layout() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppHeader />
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
