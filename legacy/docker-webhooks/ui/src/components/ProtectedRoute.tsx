// components/ProtectedRoute.tsx

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('token');

    useEffect(() => {
        if (!isAuthenticated) router.push('/login');
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    return <>{children}</>;
}
