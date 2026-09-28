import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// In-app replacement for window.confirm/alert, which embedded browsers and some
// phone web views silently block (returning false without showing anything).

interface DialogOptions {
  confirmLabel?: string;
  danger?: boolean;
}

interface Request extends DialogOptions {
  message: string;
  alertOnly: boolean;
  resolve: (ok: boolean) => void;
}

interface DialogApi {
  confirm: (message: string, opts?: DialogOptions) => Promise<boolean>;
  alert: (message: string) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<Request | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (message: string, opts: DialogOptions = {}) =>
      new Promise<boolean>((resolve) => setReq({ message, alertOnly: false, resolve, ...opts })),
    [],
  );
  const alert = useCallback(
    (message: string) =>
      new Promise<void>((resolve) => setReq({ message, alertOnly: true, resolve: () => resolve() })),
    [],
  );

  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  useEffect(() => {
    if (!req) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {req && (
        <div className="dialog-backdrop" onClick={() => close(false)}>
          <div className="dialog card" role="alertdialog" aria-modal="true" aria-label={req.message} onClick={(e) => e.stopPropagation()}>
            <p>{req.message}</p>
            <div className="dialog-actions">
              {!req.alertOnly && (
                <button className="btn" onClick={() => close(false)}>
                  Cancel
                </button>
              )}
              <button ref={okRef} className={`btn ${req.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => close(true)}>
                {req.alertOnly ? 'OK' : req.confirmLabel ?? 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
}
