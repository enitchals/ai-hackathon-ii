import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Select,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import InfoIcon from '@mui/icons-material/Info';
import { useAppTheme, themeDefinitions } from '../common/themes';
import { appRegistry } from '../registry';

export function AppHeader() {
  const { themeId, setThemeId, darkMode, toggleDarkMode } = useAppTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentApp = appRegistry.find(
    (app) => location.pathname === `/${app.path}` || location.pathname === `/${app.path}/`,
  );

  const handleNav = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNav('/')}>
            <ListItemIcon><HomeIcon /></ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>
        </ListItem>
        <Divider />
        {appRegistry.map((app) => {
          const { Component: Icon } = app.icon;
          return (
            <ListItem key={app.id} disablePadding>
              <ListItemButton
                selected={currentApp?.id === app.id}
                onClick={() => handleNav(`/${app.path}`)}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Icon style={{ width: 28, height: 28 }} />
                </ListItemIcon>
                <ListItemText primary={app.name} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setDrawerOpen(true)} aria-label="menu">
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component="button"
            onClick={() => navigate('/')}
            sx={{
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              fontWeight: 700,
              p: 0,
              fontSize: isMobile ? '1rem' : '1.25rem',
            }}
          >
            Arcade
          </Typography>

          {currentApp && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
              / {currentApp.name}
            </Typography>
          )}

          <Box sx={{ flex: 1 }} />

          <Select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            size="small"
            variant="outlined"
            sx={{ minWidth: isMobile ? 100 : 140, fontSize: '0.875rem' }}
          >
            {themeDefinitions.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {isMobile ? t.id.charAt(0).toUpperCase() + t.id.slice(1) : t.name}
              </MenuItem>
            ))}
          </Select>

          <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
            <IconButton onClick={toggleDarkMode} size="small">
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <>
              <Tooltip title="About">
                <IconButton onClick={() => handleNav('/about')} size="small">
                  <InfoIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="GitHub">
                <IconButton
                  component="a"
                  href="https://github.com/ellencarlsson/ai-hackathon-ii"
                  target="_blank"
                  rel="noopener"
                  size="small"
                >
                  <GitHubIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawer}
        <Divider />
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNav('/about')}>
              <ListItemIcon><InfoIcon /></ListItemIcon>
              <ListItemText primary="About" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              component="a"
              href="https://github.com/ellencarlsson/ai-hackathon-ii"
              target="_blank"
              rel="noopener"
            >
              <ListItemIcon><GitHubIcon /></ListItemIcon>
              <ListItemText primary="GitHub" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
    </>
  );
}
