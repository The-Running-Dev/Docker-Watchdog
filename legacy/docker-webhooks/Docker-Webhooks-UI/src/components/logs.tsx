import axios from 'axios';

import React, { useEffect, useState } from 'react';
import { Typography, Box, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel } from '@mui/material';
import { format as dateFnsFormat } from 'date-fns';
import {LogEntry} from '../../../shared/models';

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<keyof LogEntry>('timestamp');

    useEffect(() => {
        const fetchLogs = async () => {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:4000/logs', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setLogs(response.data);
        };

        fetchLogs();
    }, []);

    const handleSort = (property: keyof LogEntry) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedLogs = [...logs].sort((a, b) => {
        if (a[orderBy] < b[orderBy]) {
            return order === 'asc' ? -1 : 1;
        }
        
        if (a[orderBy] > b[orderBy]) {
            return order === 'asc' ? 1 : -1;
        }
        
        return 0;
    });

    return (
        <>
            <Box sx={{ textAlign: 'left', marginBottom: 2 }}>
                <Typography variant="h6" gutterBottom>Logs</Typography>
            </Box>
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
                        <TableRow key={index}>
                            <TableCell>{dateFnsFormat(new Date(log.timestamp), 'yyyy.MM.dd @ HH.mm.ss')}</TableCell>
                            <TableCell>{log.level}</TableCell>
                            <TableCell>{log.message}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
};

export default Logs;