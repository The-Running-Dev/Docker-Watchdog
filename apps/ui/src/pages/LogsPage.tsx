import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { LogLevel, type LogEntry, type LogPage } from '@subzerodev/watchdog-shared';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { LoadError, Loading } from '../components/Status';
import { formatTime } from '../format';
import { useLiveStore } from '../store/live';

/** The API's largest page. */
const PAGE_SIZE = 500;

const LEVELS = [LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug];

const LEVEL_COLOR: Record<LogLevel, string> = {
  [LogLevel.Error]: 'error.main',
  [LogLevel.Warn]: 'warning.main',
  [LogLevel.Info]: 'info.main',
  [LogLevel.Debug]: 'text.secondary',
};

const SINCE = [
  { value: 0, label: 'Any time' },
  { value: 15, label: 'Last 15 minutes' },
  { value: 60, label: 'Last hour' },
  { value: 24 * 60, label: 'Last 24 hours' },
  { value: 7 * 24 * 60, label: 'Last 7 days' },
];

/** A message that is a JSON object or array, pretty-printed; otherwise undefined. */
function prettyJson(message: string): string | undefined {
  const trimmed = message.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return undefined;

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return undefined;
  }
}

function LogLine({ entry }: { entry: LogEntry }) {
  const json = prettyJson(entry.message);

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '11rem 4rem 1fr' },
        columnGap: 2,
        py: 0.75,
        px: 2,
        borderBottom: 1,
        borderColor: 'divider',
        fontFamily: 'monospace',
        fontSize: '0.8125rem',
      }}
    >
      <Box component="time" dateTime={entry.timestamp} sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {formatTime(entry.timestamp)}
      </Box>
      <Box sx={{ color: LEVEL_COLOR[entry.level] ?? 'text.primary', textTransform: 'uppercase', fontWeight: 600 }}>
        {entry.level}
      </Box>
      {json ? (
        <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {json}
        </Box>
      ) : (
        <Box sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{entry.message}</Box>
      )}
    </Box>
  );
}

export function LogsPage() {
  const logs = useLiveStore((state) => state.logs);
  const addLogs = useLiveStore((state) => state.addLogs);
  const [loaded, setLoaded] = useState<{ page: number; pageCount: number; total: number }>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const [levels, setLevels] = useState<Set<LogLevel>>(() => new Set(LEVELS));
  const [search, setSearch] = useState('');
  const [since, setSince] = useState({ minutes: 0, cutoff: '' });
  const [newestFirst, setNewestFirst] = useState(true);

  // The first page; the socket adds new entries as they are logged.
  useEffect(() => {
    let current = true;

    api<LogPage>(`/api/logs?page=1&limit=${PAGE_SIZE}`)
      .then((page) => {
        if (!current) return;

        addLogs(page.data);
        setLoaded({ page: page.page, pageCount: page.pageCount, total: page.total });
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason : new Error(String(reason)));
      });

    return () => {
      current = false;
    };
  }, [addLogs, attempt]);

  const loadOlder = async () => {
    if (!loaded) return;

    setLoadingMore(true);

    try {
      const page = await api<LogPage>(`/api/logs?page=${loaded.page + 1}&limit=${PAGE_SIZE}`);

      addLogs(page.data);
      setLoaded({ page: page.page, pageCount: page.pageCount, total: page.total });
    } catch (reason) {
      setError(reason instanceof Error ? reason : new Error(String(reason)));
    } finally {
      setLoadingMore(false);
    }
  };

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = logs.filter(
      (entry) =>
        levels.has(entry.level) &&
        (!since.cutoff || entry.timestamp >= since.cutoff) &&
        (!needle || entry.message.toLowerCase().includes(needle)),
    );

    // The store keeps logs newest first.
    return newestFirst ? filtered : [...filtered].reverse();
  }, [logs, levels, search, since, newestFirst]);

  const toggleLevel = (level: LogLevel, on: boolean) =>
    setLevels((current) => {
      const next = new Set(current);

      if (on) next.add(level);
      else next.delete(level);

      return next;
    });

  const changeSince = (minutes: number) =>
    setSince({ minutes, cutoff: minutes ? new Date(Date.now() - minutes * 60_000).toISOString() : '' });

  const retry = () => {
    setError(undefined);
    setAttempt((value) => value + 1);
  };

  return (
    <>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2, alignItems: { md: 'center' } }}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          label="Since"
          value={since.minutes}
          onChange={(e) => changeSince(Number(e.target.value))}
          size="small"
          sx={{ minWidth: 180 }}
        >
          {SINCE.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={newestFirst ? 'newest' : 'oldest'}
          onChange={(_, value: string | null) => value && setNewestFirst(value === 'newest')}
          aria-label="Order"
        >
          <ToggleButton value="newest">Newest first</ToggleButton>
          <ToggleButton value="oldest">Oldest first</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <FormGroup row sx={{ mb: 2 }} aria-label="Levels">
        {LEVELS.map((level) => (
          <FormControlLabel
            key={level}
            control={<Checkbox checked={levels.has(level)} onChange={(e) => toggleLevel(level, e.target.checked)} />}
            label={level.charAt(0).toUpperCase() + level.slice(1)}
          />
        ))}
      </FormGroup>
      {error && <LoadError error={error} onRetry={retry} />}
      {!loaded && !error ? (
        <Loading />
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Showing {shown.length} of {logs.length} loaded entries
            {loaded ? ` (${loaded.total} kept by the API)` : ''}.
          </Typography>
          <Paper variant="outlined">
            {shown.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                No log entries match.
              </Typography>
            ) : (
              <Box component="ul" aria-label="Log entries" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {shown.map((entry) => (
                  <LogLine key={`${entry.timestamp}|${entry.level}|${entry.message}`} entry={entry} />
                ))}
              </Box>
            )}
          </Paper>
          {loaded && loaded.page < loaded.pageCount && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button variant="outlined" onClick={() => void loadOlder()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load older logs'}
              </Button>
            </Box>
          )}
        </>
      )}
    </>
  );
}
