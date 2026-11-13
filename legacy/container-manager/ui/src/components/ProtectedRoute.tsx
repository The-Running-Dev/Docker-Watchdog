// components/ProtectedRoute.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalStore } from '@/store/useGlobalStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const user = useGlobalStore((s) => s.user);

    useEffect(() => {
        if (user === null) {
            router.push('/login');
        }
    }, [user]);

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
