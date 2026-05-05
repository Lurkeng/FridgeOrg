import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

// Editorial Nordic Larder buttons — sharp 1px ink borders, brutalist offset shadows,
// DM Mono uppercase labels with wide letter-spacing. Each variant lifts on hover.
const variantClasses: Record<Variant, string> = {
  // Ink-on-bone with pickle-green offset shadow — the headline CTA.
  primary:
    'border border-[var(--ft-ink)] bg-[var(--ft-ink)] text-[var(--ft-bone)] ' +
    'shadow-[3px_3px_0_var(--ft-pickle)] ' +
    'hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-pickle)] ' +
    'active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-pickle)]',
  // Parchment with ink offset — the steady supporting actor.
  secondary:
    'border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-[var(--ft-ink)] ' +
    'hover:bg-[var(--ft-bone)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)] ' +
    'active:translate-y-0 active:shadow-[1px_1px_0_var(--ft-ink)]',
  // Signal red — destructive only. Stamped, unmistakable.
  danger:
    'border border-[var(--ft-signal)] bg-[var(--ft-signal)] text-[var(--ft-bone)] ' +
    'shadow-[3px_3px_0_var(--ft-ink)] ' +
    'hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-ink)] hover:bg-[#a02a18] ' +
    'active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-ink)]',
  // Borderless, low-emphasis — for secondary navigation/dismissal.
  ghost:
    'border border-transparent bg-transparent text-[rgba(21,19,15,0.62)] ' +
    'hover:bg-[var(--ft-bone)] hover:text-[var(--ft-ink)] hover:border-[rgba(21,19,15,0.20)]',
  // Pickle-accent variant for affirmative non-primary moves (e.g., "Save", "Use suggestion").
  glass:
    'border border-[var(--ft-ink)] bg-[var(--ft-pickle)] text-[var(--ft-ink)] ' +
    'shadow-[3px_3px_0_var(--ft-ink)] ' +
    'hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ft-ink)] ' +
    'active:translate-y-0 active:shadow-[2px_2px_0_var(--ft-ink)]',
};

// All sharp corners (no rounded). Mono-uppercase labels at consistent letter-spacing.
const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1   text-[10px] tracking-[0.18em] gap-1',
  sm: 'px-3.5 py-1.5 text-[10px] tracking-[0.20em] gap-1.5',
  md: 'px-5   py-2.5 text-[11px] tracking-[0.22em] gap-2',
  lg: 'px-7   py-3.5 text-[12px] tracking-[0.24em] gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', size = 'md', loading, icon, iconRight, fullWidth, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'group relative inline-flex items-center justify-center font-mono font-bold uppercase whitespace-nowrap',
          // WCAG AA tap target — 44px floor on mobile, only kicks in if intrinsic content is smaller.
          'min-h-11 min-w-11',
          'transition-all duration-150 ease-out',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-none',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ft-bone)] focus-visible:ring-[var(--ft-ink)]',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden
            className="h-3.5 w-3.5 border border-current border-t-transparent animate-spin"
          />
        ) : icon ? (
          <span className="flex-shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5">
            {icon}
          </span>
        ) : null}
        {children}
        {!loading && iconRight && (
          <span className="flex-shrink-0 ml-0.5 transition-transform duration-150 group-hover:translate-x-0.5">
            {iconRight}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
export { Button };
