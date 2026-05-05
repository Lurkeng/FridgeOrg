import { cn } from '@/lib/utils';
import { staggerDelay } from '@/lib/animations';

type GlassVariant = 'default' | 'frost' | 'fresh' | 'warning' | 'danger';
type AccentTone = GlassVariant | 'gray';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
  hover?: boolean;
  animate?: boolean;
  staggerIndex?: number;
  accentBar?: AccentTone;
  onClick?: () => void;
  as?: 'div' | 'article' | 'section' | 'li';
}

// Editorial Nordic Larder cards — 1px ink borders on warm parchment, with
// variant-tinted backgrounds. Hover lifts up and casts a brutalist offset
// shadow. The top edge can carry a 2px accent strip in the brand palette.
const variantClasses: Record<GlassVariant, string> = {
  default: 'border-[var(--ft-ink)] bg-[var(--ft-paper)]',
  frost:   'border-[var(--ft-ink)] bg-[var(--ft-paper)]',
  fresh:   'border-[rgba(90,110,0,0.55)] bg-[rgba(183,193,103,0.10)]',
  warning: 'border-[#b46c00] bg-[rgba(245,158,11,0.08)]',
  danger:  'border-[var(--ft-signal)] bg-[rgba(184,50,30,0.06)]',
};

const accentColors: Record<AccentTone, string> = {
  default: 'bg-[var(--ft-ink)]',
  frost:   'bg-[var(--ft-pickle)]',
  fresh:   'bg-[var(--ft-pickle)]',
  warning: 'bg-[#d97706]',
  danger:  'bg-[var(--ft-signal)]',
  gray:    'bg-[rgba(21,19,15,0.45)]',
};

export default function GlassCard({
  children,
  className,
  variant = 'default',
  hover = true,
  animate = true,
  staggerIndex,
  accentBar,
  onClick,
  as: Tag = 'div',
}: GlassCardProps) {
  const style = staggerIndex !== undefined ? staggerDelay(staggerIndex) : undefined;
  const isInteractive = Boolean(onClick);

  return (
    <Tag
      className={cn(
        'relative overflow-hidden border',
        variantClasses[variant],
        hover && 'transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--ft-ink)]',
        animate && 'animate-fade-in-up',
        isInteractive &&
          'cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ft-bone)] focus-visible:ring-[var(--ft-ink)]',
        className,
      )}
      style={style}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {accentBar && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0 right-0 top-0 h-[2px]',
            accentColors[accentBar],
          )}
        />
      )}
      {children}
    </Tag>
  );
}

export { GlassCard };
