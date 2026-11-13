import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  message: string;
  details?: string;
}

export interface Toast extends ToastOptions {
  id: number;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  show: (variant: ToastVariant, options: ToastOptions) => void;
  dismiss: (id: number) => void;
}

/** At most this many toasts on screen; older ones go first. */
const MAX_TOASTS = 4;

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (variant, options) =>
    set((state) => ({ toasts: [...state.toasts, { ...options, variant, id: nextId++ }].slice(-MAX_TOASTS) })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Usable outside React (socket handlers) as well as in components. */
export const toast = {
  show: (variant: ToastVariant, options: ToastOptions) => useToastStore.getState().show(variant, options),
  result: (success: boolean, options: ToastOptions) =>
    useToastStore.getState().show(success ? 'success' : 'error', options),
};
