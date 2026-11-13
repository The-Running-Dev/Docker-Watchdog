import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { Containers, DockerContainer } from '@subzerodev/watchdog-shared';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { ContainerRestartDialog, ProjectRestartDialog } from '../components/RestartDialogs';
import { LoadError, Loading } from '../components/Status';
import { UpdaterCard } from '../components/UpdaterCard';
import { formatTime } from '../format';
import { useLiveStore } from '../store/live';

type SortKey = 'Name' | 'Image' | 'Version' | 'CreatedAt';

const COLUMNS: { key: SortKey; label: string; wide?: boolean }[] = [
  { key: 'Name', label: 'Name' },
  { key: 'Image', label: 'Image', wide: true },
  { key: 'Version', label: 'Version' },
  { key: 'CreatedAt', label: 'Created', wide: true },
];

/** Shown only from sm up. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

function stateColor(container: DockerContainer): 'success' | 'warning' | 'error' | 'default' {
  if (container.Health === 'unhealthy') return 'error';
  if (container.Health === 'starting') return 'warning';
  if (container.State === 'running') return 'success';
  if (container.State === 'exited' || container.State === 'dead') return 'error';

  return 'default';
}

function matches(container: DockerContainer, project: string, filter: string): boolean {
  if (!filter) return true;

  return [project, container.Name, container.Image, container.Version ?? '', container.State].some((value) =>
    value.toLowerCase().includes(filter),
  );
}

export function ProjectsPage() {
  const projects = useLiveStore((state) => state.projects);
  const setProjects = useLiveStore((state) => state.setProjects);
  const [error, setError] = useState<Error>();
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'Name', asc: true });
  const [restartProject, setRestartProject] = useState<string | null>(null);
  const [restartContainer, setRestartContainer] = useState<string | null>(null);

  // The socket keeps the list current once it is loaded.
  useEffect(() => {
    let current = true;

    api<Containers[]>('/api/projects')
      .then((result) => {
        if (current) setProjects(result);
      })
      .catch((reason: unknown) => {
        if (current) setError(reason instanceof Error ? reason : new Error(String(reason)));
      });

    return () => {
      current = false;
    };
  }, [setProjects, attempt]);

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const compare = (a: DockerContainer, b: DockerContainer) => {
      const result = (a[sort.key] ?? '').localeCompare(b[sort.key] ?? '', undefined, { numeric: true });

      return sort.asc ? result : -result;
    };

    return (projects ?? [])
      .map((group) => ({
        project: group.Project,
        containers: group.Containers.filter((c) => matches(c, group.Project, needle)).sort(compare),
      }))
      .filter((group) => group.containers.length > 0)
      .sort((a, b) => (a.project === '' ? 1 : b.project === '' ? -1 : a.project.localeCompare(b.project)));
  }, [projects, filter, sort]);

  const toggleSort = (key: SortKey) => setSort((current) => ({ key, asc: current.key === key ? !current.asc : true }));

  const retry = () => {
    setError(undefined);
    setAttempt((value) => value + 1);
  };

  return (
    <>
      <UpdaterCard />
      <TextField
        label="Filter"
        placeholder="Project, container, image or state"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />
      {error && !projects ? (
        <LoadError error={error} onRetry={retry} />
      ) : !projects ? (
        <Loading />
      ) : groups.length === 0 ? (
        <Typography color="text.secondary">{filter ? 'No containers match the filter.' : 'No containers.'}</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Containers">
            <TableHead>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    sx={column.wide ? WIDE : undefined}
                    sortDirection={sort.key === column.key ? (sort.asc ? 'asc' : 'desc') : false}
                  >
                    <TableSortLabel
                      active={sort.key === column.key}
                      direction={sort.key === column.key && !sort.asc ? 'desc' : 'asc'}
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell>State</TableCell>
                <TableCell align="right" aria-label="Actions" />
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.project || '(standalone)'}>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell colSpan={6} sx={{ py: 0.5 }}>
                      <Typography component="h2" variant="subtitle2" sx={{ display: 'inline' }}>
                        {group.project || 'Standalone containers'}
                      </Typography>
                      {group.project && (
                        <Button
                          size="small"
                          startIcon={<RestartAltIcon />}
                          sx={{ ml: 2 }}
                          onClick={() => setRestartProject(group.project)}
                          aria-label={`Restart project ${group.project}`}
                        >
                          Restart
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {group.containers.map((container) => (
                    <TableRow key={container.Id} hover>
                      <TableCell sx={{ wordBreak: 'break-word' }}>{container.Name}</TableCell>
                      <TableCell sx={{ ...WIDE, wordBreak: 'break-all' }}>{container.Image}</TableCell>
                      <TableCell>{container.Version ?? ''}</TableCell>
                      <TableCell sx={{ ...WIDE, whiteSpace: 'nowrap' }}>{formatTime(container.CreatedAt)}</TableCell>
                      <TableCell>
                        <Tooltip title={container.Status}>
                          <Chip
                            size="small"
                            color={stateColor(container)}
                            label={container.Health ? `${container.State} (${container.Health})` : container.State}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          aria-label={`Restart container ${container.Name}`}
                          onClick={() => setRestartContainer(container.Name)}
                        >
                          <RestartAltIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <ProjectRestartDialog project={restartProject} onClose={() => setRestartProject(null)} />
      <ContainerRestartDialog container={restartContainer} onClose={() => setRestartContainer(null)} />
    </>
  );
}
