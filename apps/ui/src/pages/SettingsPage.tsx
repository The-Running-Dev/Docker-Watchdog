import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { Info } from '@subzerodev/watchdog-shared';
import type { ReactNode } from 'react';
import { useApi } from '../api/useApi';
import { LoadError, Loading } from '../components/Status';
import { UpdaterCard } from '../components/UpdaterCard';
import { formatTime } from '../format';

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;

  return JSON.stringify(value);
}

function KeyValueTable({ label, rows }: { label: string; rows: [string, ReactNode][] }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" aria-label={label}>
        <TableBody>
          {rows.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell
                component="th"
                scope="row"
                sx={{ width: { sm: '40%' }, fontWeight: 600, wordBreak: 'break-word' }}
              >
                {key}
              </TableCell>
              <TableCell sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </section>
  );
}

/** Read-only: the configuration comes from the environment, with secrets masked by the API. */
export function SettingsPage() {
  const info = useApi<Info>('/api/info');
  const config = useApi<Record<string, unknown>>('/api/config');

  return (
    <Stack spacing={4}>
      <Section title="Updater">
        <UpdaterCard />
      </Section>
      <Section title="About">
        {info.error ? (
          <LoadError error={info.error} onRetry={info.reload} />
        ) : !info.data ? (
          <Loading />
        ) : (
          <KeyValueTable
            label="About"
            rows={[
              ['Version', info.data.version],
              ['Built', info.data.buildDate ? formatTime(info.data.buildDate) : '—'],
              ['Docker engine', info.data.dockerVersion ?? 'unreachable'],
              ['Running in Docker', info.data.insideDocker ? 'yes' : 'no'],
              ['API key or login required', info.data.authEnabled ? 'yes' : 'no'],
              ['Admin login', info.data.loginEnabled ? 'configured' : 'not configured'],
            ]}
          />
        )}
      </Section>
      <Section title="Configuration">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Set through environment variables; secrets are masked.
        </Typography>
        {config.error ? (
          <LoadError error={config.error} onRetry={config.reload} />
        ) : !config.data ? (
          <Loading />
        ) : (
          <KeyValueTable
            label="Configuration"
            rows={Object.entries(config.data)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, value]) => [key, show(value)])}
          />
        )}
      </Section>
    </Stack>
  );
}
