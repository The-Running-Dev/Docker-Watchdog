import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { UpdaterStatus } from '@subzerodev/watchdog-shared';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { refreshUpdater } from '../api/live';
import { formatTime } from '../format';
import { useLiveStore } from '../store/live';
import { toast } from '../store/toasts';
import { ConfirmDialog } from './RestartDialogs';

/** The scheduled updater: when it runs next, how the last run went, and a way to run it now. */
export function UpdaterCard() {
  const updater = useLiveStore((state) => state.updater);
  const setUpdater = useLiveStore((state) => state.setUpdater);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void refreshUpdater();
  }, []);

  const run = async (dryRun: boolean) => {
    setConfirming(false);

    try {
      setUpdater(await api<UpdaterStatus>('/api/updater/run', { body: { dryRun } }));
      toast.show('info', { title: dryRun ? 'Checking for updates' : 'Updating', message: 'The result follows.' });
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? 'An update is already running.'
          : error instanceof Error
            ? error.message
            : String(error);

      toast.show('error', { title: 'Update not started', message });
    }
  };

  const last = updater?.lastRun;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Updater
              {updater?.running && <Chip size="small" color="info" label="Running" />}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!updater
                ? 'Loading…'
                : updater.scheduled
                  ? `Schedule ${updater.schedule} (${updater.timeZone}); next run ${updater.nextRun ? formatTime(updater.nextRun) : 'not planned'}.`
                  : 'Not scheduled.'}
            </Typography>
            {last && (
              <Typography variant="body2" color={last.error ? 'error' : 'text.secondary'}>
                Last run {formatTime(last.finishedAt)}
                {last.dryRun ? ' (dry run)' : ''}:{' '}
                {last.error ?? `${last.updated.length} of ${last.checked} projects updated.`}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button variant="outlined" disabled={!updater || updater.running} onClick={() => void run(true)}>
              Check for updates
            </Button>
            <Button variant="contained" disabled={!updater || updater.running} onClick={() => setConfirming(true)}>
              Update now
            </Button>
          </Stack>
        </Stack>
      </CardContent>
      <ConfirmDialog
        open={confirming}
        title="Update every project now?"
        message="Projects with a newer image are pulled and recreated, then checked for health."
        confirmLabel="Update now"
        onConfirm={() => void run(false)}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
}
