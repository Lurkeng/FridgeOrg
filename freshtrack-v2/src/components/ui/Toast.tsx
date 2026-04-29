import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

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

const typeConfig: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
  success: { icon: <CheckCircle className="w-4 h-4 text-[var(--ft-ink)]" />,   classes: 'border-[var(--ft-ink)] bg-[var(--ft-pickle)]' },
  error:   { icon: <AlertCircle className="w-4 h-4 text-[var(--ft-signal)]" />,  classes: 'border-[var(--ft-signal)] bg-[var(--ft-paper)]' },
  warning: { icon: <AlertTriangle className="w-4 h-4 text-[var(--ft-signal)]" />, classes: 'border-[var(--ft-signal)] bg-[var(--ft-paper)]' },
  info:    { icon: <Info className="w-4 h-4 text-[var(--ft-ink)]" />,           classes: 'border-[var(--ft-ink)] bg-[var(--ft-paper)]' },
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
        'flex items-start gap-3 border px-4 py-3 max-w-xs w-full transition-all duration-300',
        config.classes,
        visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
      <p className="text-sm text-[var(--ft-ink)] font-medium flex-1">{item.message}</p>
      <button
        onClick={() => { setLeaving(true); setTimeout(() => onRemove(item.id), 350); }}
        className="flex-shrink-0 text-[rgba(21,19,15,0.5)] hover:text-[var(--ft-ink)] transition-colors"
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
