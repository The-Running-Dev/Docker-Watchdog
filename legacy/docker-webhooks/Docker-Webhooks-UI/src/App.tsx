// src/App.tsx

import React from 'react';
import { Route, Routes, Navigate, Link } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import Login from './components/login';
import Dashboard from './components/dashboard';
import Logs from './components/logs';
import Images from './components/images';
import PostWebhook from './components/post-webhook';
import Update from './components/update';

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
    },
});

const App: React.FC = () => {
    const isAuthenticated = !!localStorage.getItem('token');

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <div>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            Dashboard
                        </Typography>
                        <Button color="inherit" component={Link} to="/logs" sx={{ mx: 0.5 }}>Logs</Button>
                        <Button color="inherit" component={Link} to="/images" sx={{ mx: 0.5 }}>Images</Button>
                        <Button color="inherit" component={Link} to="/post-webhook" sx={{ mx: 0.5 }}>Post Webhook</Button>
                        <Button color="inherit" component={Link} to="/update" sx={{ mx: 0.5 }}>Update</Button>
                    </Toolbar>
                </AppBar>
                <Container sx={{ marginTop: '20px' }} maxWidth="lg">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/dashboard/*" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
                        <Route path="/" element={<Navigate to="/login" />} />
                        
                        <Route path="/logs" element={<Logs />} />
                        <Route path="/images" element={<Images />} />
                        <Route path="/post-webhook" element={<PostWebhook />} />
                        <Route path="/update" element={<Update />} />
                    </Routes>
                </Container>
            </div>
        </ThemeProvider>
    );
};

export default App;