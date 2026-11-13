// src/components/Images.tsx

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
    Button,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    TableSortLabel,
} from '@mui/material';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { WebhookFormData, DockerImage } from '../models';

const Images: React.FC = () => {
    const [containers, setContainers] = useState<DockerImage[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<keyof DockerImage>('name');

    const fetchedRef = useRef(false); // Prevent double-fetch in dev

    useEffect(() => {
        if (fetchedRef.current) {
            return;
        }

        fetchedRef.current = true;

        const fetchContainers = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('http://localhost:4000/', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                setContainers(response.data.images);
            } catch (err) {
                console.error('Failed to fetch images:', err);
            }
        };

        fetchContainers();
    }, []);

    const handleSort = (property: keyof DockerImage) => {
        const isAsc = orderBy === property && order === 'asc';
        
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleRestart = async (container: string) => {
        try {
            const token = localStorage.getItem('token');
            const data: WebhookFormData = {
                event: 'webhook',
                data: {
                    container: container,
                },
                parameters: {
                    hardReset: 'false',
                },
                isTest: true
            };
            
            await axios.post(
                'http://localhost:4000/webhook',
                data,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(`${container} Restarted...`);
        } catch (err) {
            toast.error('Restart Webhook Failed...');
        }
    };

    const sortedContainers = [...containers].sort((a, b) => {
        if (a[orderBy] < b[orderBy]) return order === 'asc' ? -1 : 1;
        if (a[orderBy] > b[orderBy]) return order === 'asc' ? 1 : -1;
        
        return 0;
    });

    return (
        <>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'name'}
                                direction={orderBy === 'name' ? order : 'asc'}
                                onClick={() => handleSort('name')}
                            >
                                Container
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'tag'}
                                direction={orderBy === 'tag' ? order : 'asc'}
                                onClick={() => handleSort('tag')}
                            >
                                Tag
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'version'}
                                direction={orderBy === 'version' ? order : 'asc'}
                                onClick={() => handleSort('version')}
                            >
                                Version
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'createdAt'}
                                direction={orderBy === 'createdAt' ? order : 'asc'}
                                onClick={() => handleSort('createdAt')}
                            >
                                Created
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedContainers.map((container, index) => (
                        <TableRow key={index}>
                            <TableCell>{container.name}</TableCell>
                            <TableCell>{container.tag}</TableCell>
                            <TableCell>{container.version}</TableCell>
                            <TableCell>
                                {format(new Date(container.createdAt), 'yyyy.MM.dd @ HH.mm.ss')}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => handleRestart(container.name)}
                                >
                                    Restart
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
};

export default Images;
