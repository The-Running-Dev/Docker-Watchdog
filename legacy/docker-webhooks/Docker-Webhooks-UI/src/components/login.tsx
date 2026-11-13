// src/components/Login.tsx

import React from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

const Login: React.FC = () => {
    const navigate = useNavigate();

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
                localStorage.setItem('token', response.data.token);
                
                navigate('/dashboard');
            } else {
                console.error('No Token Received');
            }
        } catch (error) {
            console.error('Login Failed: ', error);
        }
    };

    return (
        <Container maxWidth="sm">
            <Typography variant="h4" gutterBottom>Login</Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    label="Username"
                    {...register('username')}
                    error={!!errors.username}
                    helperText={errors.username?.message}
                    fullWidth
                    margin="normal"
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
                <Button variant="contained" color="primary" type="submit">Login</Button>
            </form>
        </Container>
    );
};

export default Login;