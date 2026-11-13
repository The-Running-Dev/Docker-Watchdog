'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { ToastOptions, ToastVariant } from '@/models';

const variantIcons: Record<ToastVariant, React.ReactElement> = {
    success: <CheckCircleIcon color="success" fontSize="small"/>,
    error: <ErrorIcon color="error" fontSize="small"/>,
    warning: <WarningIcon color="warning" fontSize="small"/>,
    info: <InfoIcon color="info" fontSize="small"/>
};

export default function ToastNotification({
                                              title,
                                              message,
                                              details,
                                              variant = 'info'
                                          }: ToastOptions) {
    return (
        <Box display="flex" alignItems="flex-start" gap={1}>
            <Box pt="3px">{variantIcons[variant]}</Box>
            <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                    {title}
                </Typography>
                <Typography variant="body2">{message}</Typography>
                {details && (
                    <Typography variant="caption" sx={{color: 'text.secondary'}}>
                        {details}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}