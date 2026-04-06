import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'ghost';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  glow?: boolean;
  dot?: boolean;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100/80 text-slate-600 border border-slate-200/60',
  success: 'bg-fresh-100/80 text-fresh-700 border border-fresh-200/60',
  warning: 'bg-warning-100/80 text-warning-700 border border-warning-200/60',
  danger:  'bg-danger-100/80 text-danger-700 border border-danger-200/60',
  info:    'bg-frost-100/80 text-frost-700 border border-frost-200/60',
  ghost:   'bg-white/40 text-slate-500 border border-white/30',
};

const glowClasses: Record<BadgeVariant, string> = {
  default: '',
  success: 'shadow-[0_0_10px_rgba(34,197,94,0.25)]',
  warning: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
  danger:  'shadow-[0_0_10px_rgba(239,68,68,0.25)]',
  info:    'shadow-[0_0_10px_rgba(14,165,233,0.25)]',
  ghost:   '',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-slate-400',
  success: 'bg-fresh-500',
  warning: 'bg-warning-500',
  danger:  'bg-danger-500',
  info:    'bg-frost-500',
  ghost:   'bg-slate-400',
};

export function Badge({ children, variant = 'default', className, glow = false, dot = false, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full backdrop-blur-sm',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variantClasses[variant],
        glow && glowClasses[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant], variant !== 'default' && variant !== 'ghost' && 'animate-pulse-soft')} />
      )}
      {children}
    </span>
  );
}

export default Badge;
