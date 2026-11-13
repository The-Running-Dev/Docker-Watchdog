import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { RouterProviderProps } from 'react-router';
import { RouterProvider } from 'react-router';
import { Toaster } from './components/Toaster';
import { theme } from './theme';

/** The theme, the pages and the toasts; main.tsx passes a browser router, tests a memory one. */
export function App({ router }: { router: RouterProviderProps['router'] }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  );
}
