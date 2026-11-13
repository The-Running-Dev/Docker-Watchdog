// src/components/Auth.tsx

'use client';

import { useEffect, useState } from 'react';
import { useGlobalStore } from '@/store/useGlobalStore';
import { InfoProvider } from '@/contexts/InfoProvider';

export default function Auth({ children }: { children: React.ReactNode }) {
    const user = useGlobalStore((s) => s.user);
    const [isChecked, setChecked] = useState(false);

    useEffect(() => {
        setChecked(true); // allow hydration
    }, []);

    if (!isChecked) {
        return null;
    }

    return user ? <InfoProvider>{children}</InfoProvider> : <>{children}</>;
}