'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    Typography
} from '@mui/material';
import { format } from 'date-fns';
import { WebhookFormData } from '@/models';
import {
    Containers,
    DockerContainer,
    WebhookEvent,
    WebhookResponse
} from 'container-manager-common';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/hooks/useToast';

export default function ContainersPage() {
    const [containers, setContainers] = useState<Containers[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<keyof DockerContainer>('Name');
    const [isTest, setIsTest] = useState(true);
    const [hardReset, setHardReset] = useState(false);
    const [activeRow, setActiveRow] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [numberOfRunningContainers, setNumberOfRunningContainers] = useState(0);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fetchedRef = useRef(false);

    const {getContainers, post} = useApi();
    const {showResultToast} = useToast();

    useEffect(() => {
        if (fetchedRef.current) return;

        fetchedRef.current = true;

        const fetchContainers = async () => {
            try {
                const response = await getContainers();
                const count = response.reduce(
                    (acc, project) => acc + project.Containers.length,
                    0
                );

                setNumberOfRunningContainers(count);
                setContainers(response);
            } catch (err) {
                console.error('Failed to Get Containers:', err);
            }
        };

        fetchContainers();
    }, []);

    const handleSort = (property: keyof DockerContainer) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleUpdateClick = (projectOrContainerId: string) => {
        setActiveRow(projectOrContainerId);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => setActiveRow(null), 10000);
    };

    const handleGoClick = async (
        projectOrContainerId: string,
        event: WebhookEvent
    ) => {
        setLoading(true);

        try {
            const data: WebhookFormData = {
                event,
                data: {projectOrContainerId, hardReset, isTest}
            };

            const response = await post<WebhookResponse>(
                'http://localhost:4000/webhook',
                data
            );

            showResultToast(response.success, {
                title: response.projectOrContainerId || projectOrContainerId,
                message: response.success ? response.message : 'Failed to Restart...',
                details: response.details
            });
        } catch (err) {
            showResultToast(false, {
                title: projectOrContainerId,
                message: 'Update Failed...',
                details: (err as any)?.message || 'Unknown Error'
            });

            console.error('Error:', err);
        } finally {
            setLoading(false);
            setActiveRow(null);
        }
    };

    return numberOfRunningContainers === 0 ? (
        <Typography variant="h6" align="center">
            No Running Containers
        </Typography>
    ) : (
        <Table>
            <TableHead>
                <TableRow>
                    {['Name', 'Image', 'Version', 'CreatedAt'].map((column) => (
                        <TableCell key={column}>
                            <TableSortLabel
                                active={orderBy === column}
                                direction={orderBy === column ? order : 'asc'}
                                onClick={() => handleSort(column as keyof DockerContainer)}
                            >
                                {column === 'CreatedAt' ? 'Created' : column}
                            </TableSortLabel>
                        </TableCell>
                    ))}
                    <TableCell style={{width: '270px'}}>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {containers.map((project, index) => (
                    <React.Fragment key={index}>
                        <TableRow>
                            <TableCell colSpan={4}>
                                <h2>{project.Project || 'Individual Containers'}</h2>
                            </TableCell>
                            <TableCell>
                                {project.Project &&
                                    (activeRow === project.Project ? (
                                        loading ? (
                                            <CircularProgress/>
                                        ) : (
                                            <div>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={isTest}
                                                            onChange={(e) => setIsTest(e.target.checked)}
                                                        />
                                                    }
                                                    label="Test"
                                                />
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={hardReset}
                                                            onChange={(e) =>
                                                                setHardReset(e.target.checked)
                                                            }
                                                        />
                                                    }
                                                    label="Reset"
                                                />
                                                <Button
                                                    variant="contained"
                                                    color="secondary"
                                                    onClick={() =>
                                                        handleGoClick(
                                                            project.Project!,
                                                            WebhookEvent.UpdateProject
                                                        )
                                                    }
                                                >
                                                    Go
                                                </Button>
                                            </div>
                                        )
                                    ) : (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleUpdateClick(project.Project!)}
                                        >
                                            Update
                                        </Button>
                                    ))}
                            </TableCell>
                        </TableRow>
                        {project.Containers.map((container, idx) => (
                            <TableRow key={idx}>
                                <TableCell>{container.Name}</TableCell>
                                <TableCell>{container.Image}</TableCell>
                                <TableCell>{container.Version}</TableCell>
                                <TableCell>
                                    {format(
                                        new Date(container.CreatedAt),
                                        'yyyy.MM.dd @ HH.mm.ss'
                                    )}
                                </TableCell>
                                <TableCell>
                                    {!project.Project &&
                                        (activeRow === container.Name ? (
                                            loading ? (
                                                <CircularProgress/>
                                            ) : (
                                                <div>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={isTest}
                                                                onChange={(e) => setIsTest(e.target.checked)}
                                                            />
                                                        }
                                                        label="Test"
                                                    />
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={hardReset}
                                                                onChange={(e) =>
                                                                    setHardReset(e.target.checked)
                                                                }
                                                            />
                                                        }
                                                        label="Reset"
                                                    />
                                                    <Button
                                                        variant="contained"
                                                        color="secondary"
                                                        onClick={() =>
                                                            handleGoClick(
                                                                container.Name,
                                                                WebhookEvent.UpdateContainer
                                                            )
                                                        }
                                                    >
                                                        Go
                                                    </Button>
                                                </div>
                                            )
                                        ) : (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleUpdateClick(container.Name)}
                                            >
                                                Update
                                            </Button>
                                        ))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
            </TableBody>
        </Table>
    );
}
