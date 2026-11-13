// src/components/Auth.tsx

'use client';

import { useEffect, useState } from 'react';
import { InfoProvider } from '@/contexts/InfoProvider';

export default function Auth({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        
        setIsAuthenticated(!!token);
    }, []);

    if (isAuthenticated === null) return null; // or a loading spinner

    return isAuthenticated ? <InfoProvider>{children}</InfoProvider> : <>{children}</>;
}