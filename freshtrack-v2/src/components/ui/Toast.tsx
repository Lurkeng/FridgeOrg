import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { cn } from '@/lib/utils';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Info from 'lucide-react/dist/esm/icons/info';
import X from 'lucide-react/dist/esm/icons/x';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const typeConfig: Record<ToastType, { icon: React.ReactNode; classes: string; kicker: string; stripe: string }> = {
  success: { icon: <CheckCircle className="w-4 h-4 text-[var(--ft-ink)]" strokeWidth={2} />,
             classes: 'border-[var(--ft-ink)] bg-[var(--ft-pickle)]',
             kicker: 'Logged',
             stripe: 'bg-[var(--ft-ink)]' },
  error:   { icon: <AlertCircle className="w-4 h-4 text-[var(--ft-signal)]" strokeWidth={2} />,
             classes: 'border-[var(--ft-signal)] bg-[var(--ft-paper)]',
             kicker: 'Error',
             stripe: 'bg-[var(--ft-signal)]' },
  warning: { icon: <AlertTriangle className="w-4 h-4 text-[#7c4a00]" strokeWidth={2} />,
             classes: 'border-[#b46c00] bg-[var(--ft-paper)]',
             kicker: 'Heads up',
             stripe: 'bg-[#d97706]' },
  info:    { icon: <Info className="w-4 h-4 text-[var(--ft-ink)]" strokeWidth={2} />,
             classes: 'border-[var(--ft-ink)] bg-[var(--ft-paper)]',
             kicker: 'Notice',
             stripe: 'bg-[var(--ft-ink)]' },
};

function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const duration = item.duration ?? 3500;
  const config = typeConfig[item.type];

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(item.id), 350);
    }, duration);
    return () => clearTimeout(timer);
  }, [item.id, duration, onRemove]);

  return (
    <div
      role={item.type === "error" ? "alert" : "status"}
      aria-live={item.type === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        'relative flex items-start gap-3 border max-w-xs w-full pl-4 pr-3 py-3 transition-all duration-300',
        'shadow-[3px_3px_0_var(--ft-ink)]',
        config.classes,
        visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      )}
    >
      <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 w-1', config.stripe)} />
      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[rgba(21,19,15,0.62)] mb-0.5">{config.kicker}</p>
        <p className="text-[13px] leading-snug text-[var(--ft-ink)] font-medium">{item.message}</p>
      </div>
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onRemove(item.id), 350); }}
        className="flex-shrink-0 mt-0.5 text-[rgba(21,19,15,0.5)] hover:text-[var(--ft-ink)] transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
