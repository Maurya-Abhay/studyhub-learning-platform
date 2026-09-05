'use client';

import { CheckCircle2, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type ToastKind = 'success' | 'error';
type Toast = { id: number; kind: ToastKind; message: string };
type ToastContextValue = { showToast: (kind: ToastKind, message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const mutationMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

    window.fetch = async (input, init) => {
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      const isApiMutation = url.includes('/api/') && mutationMethods.has(method);
      const response = await originalFetch(input, init);

      if (isApiMutation) {
        try {
          const payload = await response.clone().json() as { error?: string; message?: string };
          const message = payload.error || payload.message || (response.ok ? 'Changes saved successfully.' : 'Unable to complete the action.');
          showToast(response.ok ? 'success' : 'error', message);
        } catch {
          showToast(response.ok ? 'success' : 'error', response.ok ? 'Changes saved successfully.' : 'Unable to complete the action.');
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.kind}`} key={toast.id} role="status">
            {toast.kind === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification"><X size={15} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
