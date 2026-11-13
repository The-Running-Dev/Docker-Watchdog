'use client';

import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useInfo } from '../contexts/InfoProvider';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function App({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const routeName = capitalize(pathname.replace('/', '')) || 'Dashboard';
    const { info, loading, error } = useInfo();
    const username = typeof window !== 'undefined' ? localStorage.getItem('username') : '';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        
        toast.info('Logged Out...');
        
        router.push('/login');
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <>
            <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>{routeName}</Typography>
                    <Button href="/protected/dashboard" color="inherit">Dashboard</Button>
                    <Button href="/protected/logs" color="inherit">Logs</Button>
                    <Button href="/protected/containers" color="inherit">Containers</Button>
                    <Button href="/protected/webhook" color="inherit">Webhook</Button>
                    {info?.insideDocker && <Button href="/protected/update" color="inherit">Update</Button>}
                    <Button color="inherit" onClick={handleLogout}>Logout ({username})</Button>
                </Toolbar>
            </AppBar>
            <Container sx={{ marginTop: '20px' }} maxWidth="lg">{children}</Container>
        </>
    );
}