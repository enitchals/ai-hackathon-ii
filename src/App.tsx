import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { ThemeProvider } from './common/themes';
import { Layout } from './layout/Layout';
import { Launcher } from './launcher/Launcher';
import { appRegistry } from './registry';
import './common/themes/neon.css';

const About = lazy(() => import('./About'));

function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Launcher />} />
              <Route path="about" element={<About />} />
              {appRegistry.map((app) => (
                <Route
                  key={app.id}
                  path={app.path}
                  element={
                    <Suspense fallback={<Loading />}>
                      <app.component />
                    </Suspense>
                  }
                />
              ))}
            </Route>
          </Routes>
        </Suspense>
      </ThemeProvider>
    </HashRouter>
  );
}
