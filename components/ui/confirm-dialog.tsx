'use client';

import { Check, X } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

 type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  function confirm(options: ConfirmOptions) {
    return new Promise<boolean>((resolve) => setRequest({ ...options, resolve }));
  }

  function close(value: boolean) {
    request?.resolve(value);
    setRequest(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request ? (
        <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <button type="button" className="confirm-close" onClick={() => close(false)} aria-label="Close confirmation"><X size={17} /></button>
            <div className={`confirm-icon ${request.danger ? 'danger' : ''}`}><Check size={18} /></div>
            <h2 id="confirm-title">{request.title ?? 'Please confirm'}</h2>
            <p>{request.message}</p>
            <div className="confirm-actions">
              <button type="button" className="btn secondary" onClick={() => close(false)}>{request.cancelLabel ?? 'Cancel'}</button>
              <button type="button" className={`btn ${request.danger ? 'danger-btn' : 'primary'}`} onClick={() => close(true)}>{request.confirmLabel ?? 'Confirm'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside ConfirmProvider');
  return confirm;
}
