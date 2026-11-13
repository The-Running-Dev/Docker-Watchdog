// src/app/protected/logs/page.tsx

'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableSortLabel,
    FormControl,
    FormControlLabel,
    Checkbox,
    FormGroup,
    TextField,
    CircularProgress,
    Fade,
    Button,
    Stack,
    Switch,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { format, subHours, subDays, startOfDay } from 'date-fns';
import { useGlobalStore } from '@/store/useGlobalStore';
import { LogEntry, LogLevel } from 'container-manager-common';
import { useApiContext } from '@/contexts/ApiProvider';

const capitalizeFirstLetter = (string: string) =>
    string.charAt(0).toUpperCase() + string.slice(1);

export default function LogsPage() {
    const { getLogs } = useApiContext();
    const theme = useTheme();

    const logs = useGlobalStore((s) => s.logs);
    const addLog = useGlobalStore((s) => s.addLog);
    const clearLogs = useGlobalStore((s) => s.clearLogs);

    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState<keyof LogEntry>('timestamp');
    const [selectedLogLevels, setSelectedLogLevels] = useState<LogLevel[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoJump, setAutoJump] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const fetchedRef = useRef(false);
    const bottomRef = useRef<HTMLTableRowElement>(null);

    const quickTimestamps = [
        { label: 'Last 1h', value: subHours(new Date(), 1) },
        { label: 'Last 3h', value: subHours(new Date(), 3) },
        { label: 'Last 6h', value: subHours(new Date(), 6) },
        { label: 'Last 12h', value: subHours(new Date(), 12) },
        { label: 'Last 24h', value: subHours(new Date(), 24) },
    ];

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), i);
        
        return {
            label: format(date, 'yyyy-MM-dd'),
            value: startOfDay(date),
        };
    });

    const getLogColor = (level: LogLevel): string => {
        switch (level) {
            case 'error':
                return theme.palette.error.main;
            case 'warn':
                return theme.palette.warning.main;
            case 'info':
                return theme.palette.info.main;
            default:
                return theme.palette.text.secondary;
        }
    };

    useEffect(() => {
        clearLogs();
        setPage(1);
        setHasMore(true);
        
        fetchedRef.current = false;
    }, []);

    useEffect(() => {
        if (fetchedRef.current && page === 1) {
            return;
        }

        const fetchLogsPage = async () => {
            setLoading(true);

            try {
                const { data } = await getLogs(page);

                if (!Array.isArray(data) || data.length === 0) {
                    setHasMore(false);
                    return;
                }

                const currentLogs = useGlobalStore.getState().logs;

                data.forEach((log: LogEntry) => {
                    const exists = currentLogs.some(
                        (l) => l.timestamp === log.timestamp && l.message === log.message
                    );

                    if (!exists) {
                        addLog(log);
                    }
                });

                fetchedRef.current = true;
            } catch (error) {
                console.error('Error Getting Logs:', error);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        };

        if (hasMore) {
            fetchLogsPage();
        }
    }, [page]);

    useEffect(() => {
        if (!bottomRef.current) {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && hasMore && !loading) {
                setPage((prev) => prev + 1);
            }
        });

        observer.observe(bottomRef.current);
        
        return () => observer.disconnect();
    }, [bottomRef, hasMore, loading]);

    const handleSort = (property: keyof LogEntry) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleLogLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value as LogLevel;
        
        setSelectedLogLevels((prev) =>
            event.target.checked
                ? [...prev, value]
                : prev.filter((level) => level !== value)
        );
    };

    const renderMessage = (message: string) => {
        const jsonMatch = message.match(/\{.*\}/);
        
        if (jsonMatch) {
            try {
                const json = JSON.parse(jsonMatch[0]);
                
                return <pre>{JSON.stringify(json, null, 2)}</pre>;
            } catch {}
        }
        return message;
    };

    const filteredLogs =
        selectedLogLevels.length === 0
            ? logs
            : logs.filter((log) => selectedLogLevels.includes(log.level));

    const searchedLogs = filteredLogs.filter((log) =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedLogs = [...searchedLogs].sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        
        if (aVal < bVal) {
            return order === 'asc' ? -1 : 1;
        }
        
        if (aVal > bVal) {
            return order === 'asc' ? 1 : -1;
        }
        
        return 0;
    });

    const jumpToClosestLog = (targetDate: Date) => {
        const match = sortedLogs.find((log) => new Date(log.timestamp) >= targetDate);

        if (match) {
            const row = document.getElementById(`log-${match.timestamp}`);
            
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('highlight');

                setTimeout(() => row.classList.remove('highlight'), 2000);
            }
        } else {
            alert('No matching log found.');
        }
    };

    return (
        <>
            <FormControl component="fieldset" fullWidth margin="normal">
                <FormGroup row>
                    {Object.values(LogLevel).map((level) => (
                        <FormControlLabel
                            key={level}
                            control={
                                <Checkbox
                                    checked={selectedLogLevels.includes(level)}
                                    onChange={handleLogLevelChange}
                                    value={level}
                                />
                            }
                            label={capitalizeFirstLetter(level)}
                        />
                    ))}
                </FormGroup>
            </FormControl>
            <TextField
                label="Search logs..."
                fullWidth
                margin="normal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Stack direction="row" alignItems="center" spacing={1} my={2}>
                <Typography variant="body2">Auto-Jump</Typography>
                <Switch
                    checked={autoJump}
                    onChange={(e) => setAutoJump(e.target.checked)}
                />
            </Stack>
            <Stack direction="column" spacing={2} mt={2} mb={3}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {quickTimestamps.map(({ label, value }) => (
                        <Button
                            key={label}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                if (autoJump) jumpToClosestLog(value);
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Stack>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {last7Days.map(({ label, value }) => (
                        <Button
                            key={label}
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                if (autoJump) jumpToClosestLog(value);
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Stack>
            </Stack>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'timestamp'}
                                direction={orderBy === 'timestamp' ? order : 'asc'}
                                onClick={() => handleSort('timestamp')}
                            >
                                Timestamp
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'level'}
                                direction={orderBy === 'level' ? order : 'asc'}
                                onClick={() => handleSort('level')}
                            >
                                Level
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'message'}
                                direction={orderBy === 'message' ? order : 'asc'}
                                onClick={() => handleSort('message')}
                            >
                                Message
                            </TableSortLabel>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedLogs.map((log, index) => (
                        <TableRow key={index} id={`log-${log.timestamp}`}>
                            <TableCell>
                                {format(new Date(log.timestamp), 'yyyy.MM.dd @ HH.mm.ss')}
                            </TableCell>
                            <TableCell
                                sx={{ color: getLogColor(log.level), fontWeight: 'bold' }}
                            >
                                {log.level}
                            </TableCell>
                            <TableCell>{renderMessage(log.message)}</TableCell>
                        </TableRow>
                    ))}
                    <TableRow ref={bottomRef}>
                        <TableCell colSpan={3} sx={{ textAlign: 'center', padding: 4 }}>
                            <Fade in={loading} unmountOnExit>
                                <CircularProgress size={32} />
                            </Fade>
                            {!loading && !hasMore && (
                                <Fade in timeout={400}>
                                    <div style={{ opacity: 0.6, marginTop: 8 }}>
                                        No more logs.
                                    </div>
                                </Fade>
                            )}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <style jsx global>{`
                .highlight {
                    animation: flash-highlight 2s ease-in-out;
                }

                @keyframes flash-highlight {
                    0% {
                        background-color: ${theme.palette.action.selected};
                    }
                    100% {
                        background-color: transparent;
                    }
                }
            `}</style>
        </>
    );
}
