import LogoutIcon from '@mui/icons-material/Logout';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Link, Outlet, useLocation } from 'react-router';
import { useLiveEvents } from '../api/live';
import { useAuthStore } from '../store/auth';
import { useLiveStore } from '../store/live';

const NAV = [
  { path: '/projects', label: 'Projects' },
  { path: '/logs', label: 'Logs' },
  { path: '/settings', label: 'Settings' },
  { path: '/webhook', label: 'Webhook tester' },
];

/** The app bar, the page tabs and the live connection; pages render below. */
export function Layout() {
  const credential = useAuthStore((state) => state.credential);
  const signOut = useAuthStore((state) => state.signOut);
  const connected = useLiveStore((state) => state.connected);
  const { pathname } = useLocation();
  const current = NAV.find((item) => pathname.startsWith(item.path))?.path ?? false;

  useLiveEvents(credential);

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" noWrap sx={{ flexGrow: 1 }}>
            SubZeroDev Watchdog
          </Typography>
          <Tooltip title={connected ? 'Receiving live updates' : 'Live updates are not connected'}>
            <Chip
              size="small"
              variant="outlined"
              color={connected ? 'success' : 'default'}
              label={connected ? 'Live' : 'Offline'}
            />
          </Tooltip>
          {credential && (
            <Tooltip title={credential.kind === 'token' ? `Sign out ${credential.username}` : 'Forget the API key'}>
              <IconButton aria-label="Sign out" edge="end" onClick={signOut}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
        <Tabs value={current} variant="scrollable" allowScrollButtonsMobile component="nav" aria-label="Pages">
          {NAV.map((item) => (
            <Tab key={item.path} label={item.label} value={item.path} component={Link} to={item.path} />
          ))}
        </Tabs>
      </AppBar>
      <Container maxWidth="xl" component="main" sx={{ py: 3 }}>
        <Box>
          <Outlet />
        </Box>
      </Container>
    </>
  );
}
