export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
    title: string;
    message: string;
    details?: string;
    variant: ToastVariant;
}