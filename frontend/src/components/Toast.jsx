// Tiny, dependency-free toast system.
//
// Usage:
//   const toast = useToast();
//   toast.success('Order filled');
//   toast.error('Trade failed');
//   toast.info('Position closed');
//
// Toasts auto-dismiss after `duration` ms (default 4s) and can also be
// dismissed by click.

import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const STYLES = {
  success: {
    icon: CheckCircle2,
    border: 'border-accent-green/30',
    bg: 'bg-accent-green/10',
    iconClass: 'text-accent-green'
  },
  error: {
    icon: AlertCircle,
    border: 'border-accent-red/30',
    bg: 'bg-accent-red/10',
    iconClass: 'text-accent-red'
  },
  info: {
    icon: Info,
    border: 'border-accent-blue/30',
    bg: 'bg-accent-blue/10',
    iconClass: 'text-accent-blue'
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind, message, opts = {}) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const duration = opts.duration ?? 4500;
    setToasts((cur) => [...cur, { id, kind, message, title: opts.title }]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const api = {
    success: (msg, opts) => push('success', msg, opts),
    error:   (msg, opts) => push('error',   msg, opts),
    info:    (msg, opts) => push('info',    msg, opts),
    dismiss
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none">
        {toasts.map((t) => {
          const s = STYLES[t.kind] || STYLES.info;
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              onClick={() => dismiss(t.id)}
              className={`pointer-events-auto cursor-pointer card ${s.bg} ${s.border} px-4 py-3 flex items-start gap-3 shadow-lg animate-[fadeIn_.18s_ease-out]`}
            >
              <Icon size={18} className={`${s.iconClass} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                {t.title && (
                  <div className="font-medium text-sm text-white mb-0.5">{t.title}</div>
                )}
                <div className="text-sm text-white/80 break-words">{t.message}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
                className="text-white/40 hover:text-white flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // No-op fallback if used outside provider (e.g. early errors)
    return {
      success: () => null,
      error:   () => null,
      info:    () => null,
      dismiss: () => null
    };
  }
  return ctx;
}
