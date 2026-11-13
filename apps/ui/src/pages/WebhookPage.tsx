import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  WebhookEvent,
  webhookRequestSchema,
  type Containers,
  type WebhookRequest,
  type WebhookResponse,
} from '@subzerodev/watchdog-shared';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { api, ApiError } from '../api/client';
import { ConfirmDialog } from '../components/RestartDialogs';
import { useLiveStore } from '../store/live';

type WebhookForm = z.input<typeof webhookRequestSchema>;

const STORAGE_KEY = 'watchdog-webhook-form';

const DEFAULTS: WebhookForm = {
  event: WebhookEvent.UpdateProject,
  data: { projectOrContainerId: '', hardReset: false, deleteVolumes: false, isTest: true },
};

/** The last form, if one was saved; storage can be missing or blocked. */
function loadForm(): WebhookForm {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? webhookRequestSchema.safeParse(JSON.parse(saved)) : undefined;

    return parsed?.success ? parsed.data : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveForm(form: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Remembering the form is a convenience only.
  }
}

interface Outcome {
  status: number;
  body: unknown;
}

function isWebhookResponse(body: unknown): body is WebhookResponse {
  return typeof body === 'object' && body !== null && 'success' in body && 'message' in body;
}

/** Sends POST /api/webhook as a CI job would, and shows the answer. */
export function WebhookPage() {
  const projects = useLiveStore((state) => state.projects);
  const setProjects = useLiveStore((state) => state.setProjects);
  const [outcome, setOutcome] = useState<Outcome>();
  const [pending, setPending] = useState<WebhookRequest>();
  const [busy, setBusy] = useState(false);
  const [initial] = useState(loadForm);

  const { control, handleSubmit, subscribe, setValue, reset, formState } = useForm<
    WebhookForm,
    unknown,
    WebhookRequest
  >({
    resolver: zodResolver(webhookRequestSchema),
    defaultValues: initial,
  });

  const event = useWatch({ control, name: 'event' });
  const hardReset = useWatch({ control, name: 'data.hardReset' });
  const deleteVolumes = useWatch({ control, name: 'data.deleteVolumes' });

  useEffect(() => subscribe({ formState: { values: true }, callback: ({ values }) => saveForm(values) }), [subscribe]);

  // Targets to pick from; any id can still be typed.
  useEffect(() => {
    if (projects) return;

    api<Containers[]>('/api/projects')
      .then(setProjects)
      .catch(() => undefined);
  }, [projects, setProjects]);

  const targets = useMemo(() => {
    const groups = projects ?? [];
    const names =
      event === WebhookEvent.UpdateProject
        ? groups.map((group) => group.Project).filter(Boolean)
        : groups.flatMap((group) => group.Containers.map((container) => container.Name));

    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [projects, event]);

  const send = async (request: WebhookRequest) => {
    setPending(undefined);
    setBusy(true);

    try {
      setOutcome({ status: 200, body: await api<WebhookResponse>('/api/webhook', { body: request }) });
    } catch (error) {
      setOutcome(
        error instanceof ApiError
          ? { status: error.status, body: error.body ?? error.message }
          : { status: 0, body: error instanceof Error ? error.message : String(error) },
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = handleSubmit((request) =>
    request.data.deleteVolumes && !request.data.isTest ? setPending(request) : void send(request),
  );

  const success = outcome && outcome.status >= 200 && outcome.status < 300;
  const body = outcome?.body;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Typography color="text.secondary">
        Sends the same request a CI job sends to <code>POST /api/webhook</code>. Test mode lists the commands without
        running them.
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box component="form" noValidate onSubmit={(e) => void submit(e)}>
          <Stack spacing={2}>
            <Controller
              name="event"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Event" size="small">
                  <MenuItem value={WebhookEvent.UpdateProject}>update-project</MenuItem>
                  <MenuItem value={WebhookEvent.UpdateContainer}>update-container</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="data.projectOrContainerId"
              control={control}
              render={({ field, fieldState }) => (
                <Autocomplete
                  freeSolo
                  options={targets}
                  value={field.value}
                  inputValue={field.value}
                  onInputChange={(_, value) => field.onChange(value)}
                  onChange={(_, value) => field.onChange(value ?? '')}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      inputRef={field.ref}
                      onBlur={field.onBlur}
                      label={event === WebhookEvent.UpdateProject ? 'Project' : 'Container'}
                      size="small"
                      required
                      error={!!fieldState.error}
                      helperText={fieldState.error ? 'Pick or type a name.' : undefined}
                    />
                  )}
                />
              )}
            />
            <FormGroup>
              <Controller
                name="data.hardReset"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!field.value}
                        onChange={(e) => {
                          field.onChange(e.target.checked);
                          if (!e.target.checked) setValue('data.deleteVolumes', false);
                        }}
                      />
                    }
                    label="Hard reset (down, then up)"
                    disabled={event !== WebhookEvent.UpdateProject}
                  />
                )}
              />
              <Controller
                name="data.deleteVolumes"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        color="error"
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label="Delete volumes"
                    disabled={event !== WebhookEvent.UpdateProject || !hardReset}
                  />
                )}
              />
              <FormHelperText sx={{ mt: 0, ml: 4 }}>
                Needs a hard reset. Removes the project&apos;s data.
              </FormHelperText>
              <Controller
                name="data.isTest"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Test mode (list the commands only)"
                  />
                )}
              />
            </FormGroup>
            {deleteVolumes && (
              <Alert severity="warning">The project&apos;s volumes will be deleted unless test mode is on.</Alert>
            )}
            {formState.errors.data?.deleteVolumes && (
              <Alert severity="error">{formState.errors.data.deleteVolumes.message}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained" color={deleteVolumes ? 'error' : 'primary'} disabled={busy}>
                {busy ? 'Sending…' : 'Send'}
              </Button>
              <Button
                onClick={() => {
                  reset(DEFAULTS);
                  setOutcome(undefined);
                }}
                disabled={busy}
              >
                Reset
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
      {outcome && (
        <Alert severity={success ? 'success' : 'error'} aria-live="polite">
          <AlertTitle>
            {outcome.status ? `HTTP ${outcome.status}` : 'No answer'}
            {isWebhookResponse(body) ? `: ${body.message}` : ''}
          </AlertTitle>
          <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8125rem' }}>
            {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
          </Box>
        </Alert>
      )}
      <ConfirmDialog
        open={!!pending}
        danger
        title={`Delete the volumes of ${pending?.data.projectOrContainerId ?? ''}?`}
        message="The project is taken down and its volumes are removed before it starts again. Their data cannot be recovered."
        confirmLabel="Delete volumes and restart"
        onConfirm={() => pending && void send(pending)}
        onCancel={() => setPending(undefined)}
      />
    </Stack>
  );
}
