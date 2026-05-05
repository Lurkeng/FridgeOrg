import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import X from 'lucide-react/dist/esm/icons/x';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = `modal-title-${title.toLowerCase().replace(/\s+/g, "-")}`;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    if (isOpen) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabTrap);
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabTrap);
      document.body.style.overflow = '';
      if (isOpen) {
        lastFocusedElementRef.current?.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(21, 19, 15, 0.42)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="absolute inset-0" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative w-full animate-scale-in border border-[var(--ft-ink)] bg-[var(--ft-paper)]',
          'shadow-[6px_6px_0_var(--ft-ink)]',
          sizeClasses[size],
        )}
      >
        {/* Top accent bar — pickle / signal alternating bands */}
        <div aria-hidden className="flex h-1.5">
          <span className="flex-1 bg-[var(--ft-pickle)]" />
          <span className="flex-1 bg-[var(--ft-ink)]" />
          <span className="flex-1 bg-[var(--ft-signal)]" />
        </div>
        <div className="flex items-start justify-between gap-4 px-7 py-6 border-b border-[var(--ft-ink)]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="h-px w-6 bg-[var(--ft-ink)]" aria-hidden />
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">Dialog</p>
            </div>
            <h2
              id={titleId}
              className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.025em] text-[var(--ft-ink)] [text-wrap:balance]"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[rgba(21,19,15,0.62)]">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)] hover:rotate-90"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
        <div className="px-7 py-6 max-h-[72vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
