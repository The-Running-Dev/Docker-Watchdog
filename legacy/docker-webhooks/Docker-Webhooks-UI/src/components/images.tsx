import axios from 'axios';

import React, { useEffect, useState } from 'react';
import { Typography, Box, Table, TableHead, TableBody, TableRow, TableCell, TableSortLabel } from '@mui/material';
import { format as dateFnsFormat } from 'date-fns/format';
import { DockerImage } from '../models';

const Images: React.FC = () => {
    const [images, setImages] = useState<DockerImage[]>([]);
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = useState<keyof DockerImage>('name');

    useEffect(() => {
        const fetchImages = async () => {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:4000/', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setImages(response.data.images);
        };

        fetchImages();
    }, []);

    const handleSort = (property: keyof DockerImage) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedImages = [...images].sort((a, b) => {
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
                <Typography variant="h6" gutterBottom>Images</Typography>
            </Box>
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
                                active={orderBy === 'createdAt'}
                                direction={orderBy === 'createdAt' ? order : 'asc'}
                                onClick={() => handleSort('createdAt')}
                            >
                                Created
                            </TableSortLabel>
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedImages.map((image, index) => (
                        <TableRow key={index}>
                            <TableCell>{image.name}</TableCell>
                            <TableCell>{image.tag}</TableCell>
                            <TableCell>{dateFnsFormat(new Date(image.createdAt), 'yyyy.MM.dd @ HH.mm.ss')}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </>
    );
};

export default Images;