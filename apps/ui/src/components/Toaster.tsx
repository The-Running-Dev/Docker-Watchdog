import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Slide from '@mui/material/Slide';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect } from 'react';
import { useToastStore, type Toast } from '../store/toasts';

/** How long a toast stays; errors stay longer. */
export const TOAST_DURATION_MS = 6_000;
export const ERROR_TOAST_DURATION_MS = 12_000;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    const timer = setTimeout(
      () => dismiss(toast.id),
      toast.variant === 'error' ? ERROR_TOAST_DURATION_MS : TOAST_DURATION_MS,
    );

    return () => clearTimeout(timer);
  }, [dismiss, toast.id, toast.variant]);

  return (
    <Slide direction="left" in mountOnEnter>
      <Alert severity={toast.variant} variant="filled" onClose={() => dismiss(toast.id)} sx={{ boxShadow: 4 }}>
        <AlertTitle>{toast.title}</AlertTitle>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {toast.message}
        </Typography>
        {toast.details && (
          <Typography variant="caption" component="div" sx={{ mt: 0.5, whiteSpace: 'pre-wrap', opacity: 0.85 }}>
            {toast.details}
          </Typography>
        )}
      </Alert>
    </Slide>
  );
}

/** The toasts, stacked bottom right (bottom, full width, on a phone). */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <Stack
      spacing={1}
      aria-live="polite"
      sx={{
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.snackbar,
        bottom: 16,
        right: 16,
        left: { xs: 16, sm: 'auto' },
        width: { sm: 420 },
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </Stack>
  );
}
