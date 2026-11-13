// src/components/Logs.tsx

import React, { useEffect, useState } from 'react';

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
    FormGroup
} from '@mui/material';
import { format } from 'date-fns';
import ApiService from '../services/api.service.ts';
import { LogEntry, LogLevel } from '../../../shared/models/index';

const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const Logs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [orderBy, setOrderBy] = useState<keyof LogEntry>('timestamp');
    const [selectedLogLevels, setSelectedLogLevels] = useState<LogLevel[]>([]);
    
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const logs = await ApiService.getLogs();
                
                setLogs(logs);
            } catch (error) {
                console.error('Failed to Fetch Logs:', error);
            }
        };

        fetchLogs();
    }, []);

    const handleSort = (property: keyof LogEntry) => {
        const isAsc = orderBy === property && order === 'asc';
        
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleLogLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value as LogLevel;
        
        setSelectedLogLevels(prev =>
            event.target.checked ? [...prev, value] : prev.filter(level => level !== value)
        );
    };

    const filteredLogs = selectedLogLevels.length === 0
        ? logs
        : logs.filter(log => selectedLogLevels.includes(log.level));

    const sortedLogs = [...filteredLogs].sort((a, b) => {
        if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
        if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;

        return 0;
    });

    const renderMessage = (message: string) => {
        const jsonMatch = message.match(/\{.*\\}/);
        
        if (jsonMatch) {
            try {
                const json = JSON.parse(jsonMatch[1]);

                return JSON.stringify(json, null, 2);
            } catch (error) {
                console.error('Failed to Parse JSON:', error);
            }
        }
        
        return message;
    };

    return (
        <>
            <FormControl component="fieldset" fullWidth margin="normal">
                <FormGroup row>
                    {Object.values(LogLevel).map(level => (
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
                            <TableCell>
                                {format(new Date(log.timestamp), 'yyyy.MM.dd @ HH.mm.ss')}
                            </TableCell>
                            <TableCell>{log.level}</TableCell>
                            <TableCell>{renderMessage(log.message)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
};

export default Logs;
