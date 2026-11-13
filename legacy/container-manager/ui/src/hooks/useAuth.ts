// src/hooks/useAuth.ts

'use client';

import { useState } from 'react';
import axios from 'axios';
import { useGlobalStore } from '@/store/useGlobalStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useAuth() {
    const user = useGlobalStore((s) => s.user);
    const loginToStore = useGlobalStore((s) => s.login);
    const logoutFromStore = useGlobalStore((s) => s.logout);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const login = async (username: string, password: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/auth/login`, {
                username,
                password,
            });
            
            const { token } = response.data;

            loginToStore({ username, token });
            
            return true;
        } catch (err: any) {
            setError(err?.response?.data || 'Login Failed');
            
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        logoutFromStore();
    };

    return {
        user,
        isLoggedIn: !!user,
        login,
        logout,
        loading,
        error,
    };
}
