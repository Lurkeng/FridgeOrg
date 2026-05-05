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

// Warm parchment palette — sharp 1px borders, no rounded pills.
const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--ft-paper)] text-[var(--ft-ink)] border border-[var(--ft-ink)]',
  success: 'bg-[rgba(183,193,103,0.18)] text-[#3a4808] border border-[rgba(90,110,0,0.55)]',
  warning: 'bg-[rgba(245,158,11,0.14)] text-[#7c4a00] border border-[rgba(180,108,0,0.55)]',
  danger:  'bg-[rgba(184,50,30,0.12)] text-[#8e2515] border border-[rgba(184,50,30,0.55)]',
  info:    'bg-[rgba(21,19,15,0.06)] text-[var(--ft-ink)] border border-[rgba(21,19,15,0.55)]',
  ghost:   'bg-transparent text-[rgba(21,19,15,0.58)] border border-[rgba(21,19,15,0.20)]',
};

const glowClasses: Record<BadgeVariant, string> = {
  default: '',
  success: 'shadow-[0_0_10px_rgba(183,193,103,0.32)]',
  warning: 'shadow-[0_0_10px_rgba(245,158,11,0.28)]',
  danger:  'shadow-[0_0_10px_rgba(184,50,30,0.28)]',
  info:    '',
  ghost:   '',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-[var(--ft-ink)]',
  success: 'bg-[var(--ft-pickle)]',
  warning: 'bg-[#d97706]',
  danger:  'bg-[var(--ft-signal)]',
  info:    'bg-[var(--ft-ink)]',
  ghost:   'bg-[rgba(21,19,15,0.40)]',
};

export function Badge({ children, variant = 'default', className, glow = false, dot = false, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.10em]',
        size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]',
        variantClasses[variant],
        glow && glowClasses[variant],
        className,
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 flex-shrink-0',
            dotColors[variant],
            variant !== 'default' && variant !== 'ghost' && variant !== 'info' && 'animate-pulse-soft',
          )}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
