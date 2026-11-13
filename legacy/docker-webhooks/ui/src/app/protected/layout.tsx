'use client';

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import App from '@/components/App';
import PageFade from '@/components/PageFade';
import Auth from '@/components/Auth';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return (
        <Auth>
            <ProtectedRoute>
                <App>
                    <PageFade>{children}</PageFade>
                </App>
            </ProtectedRoute>
        </Auth>
    );
}