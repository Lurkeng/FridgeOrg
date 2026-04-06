'use client';

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

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-frost-600 to-frost-500 text-white border border-frost-500/30 shadow-glow-frost hover:from-frost-500 hover:to-frost-400 hover:shadow-[0_0_28px_rgba(14,165,233,0.35)]',
  secondary:
    'glass text-slate-700 hover:bg-white/80 hover:text-slate-900',
  danger:
    'bg-gradient-to-r from-danger-600 to-danger-500 text-white border border-danger-500/30 shadow-glow-danger hover:from-danger-500 hover:to-danger-400',
  ghost:
    'bg-transparent text-slate-600 hover:bg-white/50 hover:text-slate-900',
  glass:
    'glass text-frost-700 border-frost-200/40 hover:bg-frost-50/80 hover:text-frost-800 hover:shadow-glow-frost',
};

const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'px-3.5 py-1.5 text-sm rounded-xl gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-2xl gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      loading,
      icon,
      iconRight,
      fullWidth,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200 active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-frost-400/60 focus-visible:ring-offset-1',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
        {!loading && iconRight && <span className="flex-shrink-0 ml-1">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Named export for backwards compat
export { Button };
