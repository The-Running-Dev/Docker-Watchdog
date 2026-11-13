import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 8 }}>
      <CircularProgress size={24} />
      <Typography color="text.secondary">{label}</Typography>
    </Box>
  );
}

export function Unreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', py: 8, px: 2 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        API unreachable
      </Alert>
    </Box>
  );
}

/** An error from a page's request, with a retry. */
export function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Alert
      severity="error"
      sx={{ my: 2 }}
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}
