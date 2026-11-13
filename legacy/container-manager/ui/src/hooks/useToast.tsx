'use client';

import { useCallback } from 'react';
import { toast } from 'react-toastify';
import ToastNotification from '@/components/ToastNotification';
import { ToastOptions, ToastVariant } from '@/models';

export const useToast = () => {
    const showToast = useCallback((variant: ToastVariant, options: ToastOptions) => {
        toast[variant](
            <ToastNotification
                title={options.title}
                message={options.message}
                details={options.details}
                variant={options.variant || variant}
            />
        );
    }, []);

    const showResultToast = useCallback(
        (
            success: boolean,
            {
                title,
                message,
                details
            }: {
                title: string;
                message: string;
                details?: string;
            }
        ) => {
            const type: ToastVariant = success ? 'success' : 'error';
            showToast(type, {title, message, details, variant: type});
        },
        [showToast]
    );

    return {showToast, showResultToast};
};