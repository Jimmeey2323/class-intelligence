import { useState, useCallback } from 'react';

interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface Toast extends ToastProps {
  id: string;
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: ToastProps) => {
    const id = (++toastCount).toString();
    const newToast: Toast = { id, title, description, variant };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
    
    // Log to console as well
    console.log(`[Toast ${variant.toUpperCase()}] ${title}${description ? `: ${description}` : ''}`);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toast,
    toasts,
    dismissToast
  };
}