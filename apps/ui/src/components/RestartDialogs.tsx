import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import type { ContainerRestartOptions, ProjectRestartOptions } from '@subzerodev/watchdog-shared';
import { useState } from 'react';
import { restartContainer, restartProject } from '../api/restart';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirm} color={danger ? 'error' : 'primary'} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const PROJECT_DEFAULTS: Required<Omit<ProjectRestartOptions, 'additionalArgs'>> = {
  pull: true,
  hardReset: false,
  deleteVolumes: false,
  dryRun: false,
};

/** Restart a compose project; deleting volumes needs a hard reset and a second confirmation. */
export function ProjectRestartDialog({ project, onClose }: { project: string | null; onClose: () => void }) {
  const [options, setOptions] = useState(PROJECT_DEFAULTS);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof PROJECT_DEFAULTS, value: boolean) =>
    setOptions((current) => {
      const next = { ...current, [key]: value };

      // deleteVolumes needs hardReset.
      if (!next.hardReset) next.deleteVolumes = false;

      return next;
    });

  const close = () => {
    setOptions(PROJECT_DEFAULTS);
    setConfirming(false);
    onClose();
  };

  const run = async () => {
    if (!project) return;

    setConfirming(false);
    setBusy(true);
    await restartProject(project, options);
    setBusy(false);
    close();
  };

  const submit = () => (options.deleteVolumes && !options.dryRun ? setConfirming(true) : void run());

  return (
    <>
      <Dialog open={project !== null && !confirming} onClose={busy ? undefined : close} maxWidth="xs" fullWidth>
        <DialogTitle>Restart {project}</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={options.pull} onChange={(e) => set('pull', e.target.checked)} />}
              label="Pull images first"
            />
            <FormControlLabel
              control={<Checkbox checked={options.hardReset} onChange={(e) => set('hardReset', e.target.checked)} />}
              label="Hard reset (down, then up)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  color="error"
                  checked={options.deleteVolumes}
                  disabled={!options.hardReset}
                  onChange={(e) => set('deleteVolumes', e.target.checked)}
                />
              }
              label="Delete volumes"
            />
            <FormHelperText sx={{ mt: 0, ml: 4 }}>Needs a hard reset. Removes the project&apos;s data.</FormHelperText>
            <FormControlLabel
              control={<Checkbox checked={options.dryRun} onChange={(e) => set('dryRun', e.target.checked)} />}
              label="Dry run (list the commands only)"
            />
          </FormGroup>
          {options.deleteVolumes && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              The project&apos;s volumes will be deleted.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={options.deleteVolumes ? 'error' : 'primary'}
            onClick={submit}
            disabled={busy}
          >
            {busy ? 'Restarting…' : options.dryRun ? 'Dry run' : 'Restart'}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirming}
        danger
        title={`Delete the volumes of ${project}?`}
        message="The project is taken down and its volumes are removed before it starts again. Their data cannot be recovered."
        confirmLabel="Delete volumes and restart"
        onConfirm={() => void run()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

const CONTAINER_DEFAULTS: ContainerRestartOptions = { mode: 'recreate', pull: false, dryRun: false };

export function ContainerRestartDialog({ container, onClose }: { container: string | null; onClose: () => void }) {
  const [options, setOptions] = useState(CONTAINER_DEFAULTS);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOptions(CONTAINER_DEFAULTS);
    onClose();
  };

  const run = async () => {
    if (!container) return;

    setBusy(true);
    await restartContainer(container, { ...options, pull: options.mode === 'recreate' && options.pull });
    setBusy(false);
    close();
  };

  return (
    <Dialog open={container !== null} onClose={busy ? undefined : close} maxWidth="xs" fullWidth>
      <DialogTitle>Restart {container}</DialogTitle>
      <DialogContent>
        <RadioGroup
          value={options.mode}
          onChange={(e) => setOptions({ ...options, mode: e.target.value as ContainerRestartOptions['mode'] })}
        >
          <FormControlLabel value="recreate" control={<Radio />} label="Recreate (compose up --force-recreate)" />
          <FormControlLabel value="restart" control={<Radio />} label="Restart (docker restart)" />
        </RadioGroup>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={options.pull}
                disabled={options.mode === 'restart'}
                onChange={(e) => setOptions({ ...options, pull: e.target.checked })}
              />
            }
            label="Pull the image first"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={options.dryRun}
                onChange={(e) => setOptions({ ...options, dryRun: e.target.checked })}
              />
            }
            label="Dry run (list the commands only)"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void run()} disabled={busy}>
          {busy ? 'Restarting…' : options.dryRun ? 'Dry run' : 'Restart'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
