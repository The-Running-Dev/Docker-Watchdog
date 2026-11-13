'use client';

import { ThemeProvider, CssBaseline } from '@mui/material';
import darkTheme from '../theme/dark';
import React from 'react';

const Theme: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
};

export default Theme;