// src/components/login.tsx

import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    TextField,
    Button,
    Container,
    Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-toastify';

const schema = z.object({
    username: z.string().min(1, 'Username is Required'),
    password: z.string().min(1, 'Password is Required'),
});

type FormData = z.infer<typeof schema>;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const usernameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (usernameRef.current) {
            usernameRef.current.focus();
        }
    }, []);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            const response = await axios.post('http://localhost:4000/login', data);

            if (response.data.token) {
                toast.success('Login Successful!');

                localStorage.setItem('username', response.data.username);
                localStorage.setItem('token', response.data.token);
                
                navigate('/dashboard');
            } else {
                console.error('No Token Received');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                console.error('Login Failed:', error.response?.data || error.message);
            } else {
                console.error('Login Failed:', error);
            }
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
                <Button
                    variant="contained"
                    color="primary"
                    type="submit"
                    fullWidth
                    sx={{ mt: 2 }}
                >
                    Login
                </Button>
            </form>
        </Container>
    );
};

export default Login;

