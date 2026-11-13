import AppBar from '@mui/material/AppBar';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import type { Info } from '@subzerodev/watchdog-shared';
import { useEffect, useState } from 'react';

export function App() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/info')
      .then((res) => (res.ok ? (res.json() as Promise<Info>) : Promise.reject(new Error(res.statusText))))
      .then(setInfo)
      .catch(() => setError(true));
  }, []);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="h1">
            SubZeroDev Watchdog
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Typography role="status">
          {error ? 'API unreachable' : info ? `API version ${info.version}` : 'Connecting to the API…'}
        </Typography>
      </Container>
    </>
  );
}
