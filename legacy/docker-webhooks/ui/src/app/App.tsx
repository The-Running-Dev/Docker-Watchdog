// src/App.tsx

import React from 'react';
import { Route, Routes, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    Button,
    Container
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useInfo } from '../../my-next-app/src/contexts/InfoProvider.tsx';

import Login from '../../my-next-app/src/components/login.tsx';
import Dashboard from '../../my-next-app/src/components/dashboard.tsx';
import Logs from '../../my-next-app/src/components/logs.tsx';
import Containers from '../../my-next-app/src/components/containers.tsx';
import Webhook from '../../my-next-app/src/components/webhook.tsx';
import Update from '../../my-next-app/src/components/update.tsx';
import AuthRoute from '../../my-next-app/src/components/auth-route.tsx';

const darkTheme = createTheme({palette: {mode: 'dark'}});
const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const App: React.FC = () => {
    const isAuthenticated = !!localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const {info, loading, error} = useInfo();
    const navigate = useNavigate();
    const location = useLocation();
    const routeName = capitalizeFirstLetter(location.pathname.replace('/', ''));

    //if (loading) return <div>Loading...</div>;
    //if (error) return <div>{error}</div>;

    if (isAuthenticated && loading) return <div>Loading...</div>;
    if (isAuthenticated && error) return <div>{error}</div>;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');

        toast.info('Logged Out...');

        navigate('/login');
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline/>
            <ToastContainer position="bottom-right" autoClose={3000} theme="dark"/>

            {isAuthenticated && (
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" sx={{flexGrow: 1}}>
                            {routeName}
                        </Typography>
                        <Button color="inherit" component={Link} to="/dashboard" sx={{mx: 0.5}}>
                            Dashboard
                        </Button>
                        <Button color="inherit" component={Link} to="/logs" sx={{mx: 0.5}}>
                            Logs
                        </Button>
                        <Button color="inherit" component={Link} to="/containers" sx={{mx: 0.5}}>
                            Containers
                        </Button>
                        <Button color="inherit" component={Link} to="/webhook" sx={{mx: 0.5}}>
                            Webhook
                        </Button>
                        {info?.insideDocker && (
                            <Button color="inherit" component={Link} to="/update" sx={{mx: 0.5}}>
                                Update
                            </Button>
                        )}
                        <Button color="inherit" onClick={handleLogout}>
                            Logout ({username})
                        </Button>
                    </Toolbar>
                </AppBar>
            )}

            <Container sx={{marginTop: '20px'}} maxWidth="lg">
                <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                        <Route
                            path="/login"
                            element={
                                isAuthenticated ? (
                                    <Navigate to="/dashboard" replace/>
                                ) : (
                                    <FadePage><Login/></FadePage>
                                )
                            }
                        />
                        <Route path="/" element={<Navigate to="/dashboard"/>}/>
                        <Route path="/dashboard" element={<AuthRoute><FadePage><Dashboard/></FadePage></AuthRoute>}/>
                        <Route path="/logs" element={<AuthRoute><FadePage><Logs/></FadePage></AuthRoute>}/>
                        <Route path="/containers" element={<AuthRoute><FadePage><Containers/></FadePage></AuthRoute>}/>
                        <Route path="/webhook" element={<AuthRoute><FadePage><Webhook/></FadePage></AuthRoute>}/>
                        <Route path="/update"
                               element={
                                   !info?.insideDocker ? (
                                       <Navigate to="/dashboard" replace/>
                                   ) : (
                                       <AuthRoute><FadePage><Update/></FadePage></AuthRoute>
                                   )
                               }
                        />
                    </Routes>
                </AnimatePresence>
            </Container>
        </ThemeProvider>
    );
};

// Fade transition wrapper
const FadePage: React.FC<{ children: React.ReactNode }> = ({children}) => (
    <motion.div
        initial={{opacity: 0, y: 15}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -10}}
        transition={{duration: 0.3}}
    >
        {children}
    </motion.div>
);

export default App;

