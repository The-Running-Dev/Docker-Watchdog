// src/app/login/page.tsx

'use client';

import { useEffect, useRef } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
    const router = useRouter();
    const {login, error, loading} = useAuth();
    const usernameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    const {
        register,
        handleSubmit,
        formState: {errors}
    } = useForm<FormData>({
        resolver: zodResolver(schema)
    });

    const onSubmit = async (data: FormData) => {
        const success = await login(data.username, data.password);

        if (success) {
            toast.success('Login Successful!');
            
            router.push('/protected/dashboard');
        } else {
            toast.error(error || 'Login Failed');
        }
    };

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" gutterBottom>
                Login
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    label="Username"
                    {...register('username')}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    fullWidth
                    margin="normal"
                    inputRef={usernameRef}
                />

                <TextField
                    label="Password"
                    type="password"
                    {...register('password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    fullWidth
                    margin="normal"
                />

                {error && (
                    <Alert severity="error" sx={{mt: 2}}>
                        {error}
                    </Alert>
                )}

                <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    fullWidth
                    disabled={loading}
                    sx={{mt: 2}}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </Button>
            </form>
        </Container>
    );
}
