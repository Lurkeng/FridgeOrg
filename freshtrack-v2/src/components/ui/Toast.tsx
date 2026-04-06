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
  success: { icon: <CheckCircle className="w-4 h-4 text-fresh-600" />,   classes: 'border-l-4 border-fresh-400 bg-fresh-50/90' },
  error:   { icon: <AlertCircle className="w-4 h-4 text-danger-600" />,  classes: 'border-l-4 border-danger-400 bg-danger-50/90' },
  warning: { icon: <AlertTriangle className="w-4 h-4 text-warning-600" />, classes: 'border-l-4 border-warning-400 bg-warning-50/90' },
  info:    { icon: <Info className="w-4 h-4 text-frost-600" />,           classes: 'border-l-4 border-frost-400 bg-frost-50/90' },
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
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-2xl shadow-glass backdrop-blur-glass max-w-xs w-full transition-all duration-300',
        config.classes,
        visible && !leaving ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8',
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{config.icon}</span>
      <p className="text-sm text-slate-800 font-medium flex-1">{item.message}</p>
      <button onClick={() => { setLeaving(true); setTimeout(() => onRemove(item.id), 350); }} className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
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
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
