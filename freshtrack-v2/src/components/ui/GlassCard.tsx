import { cn } from '@/lib/utils';
import { staggerDelay } from '@/lib/animations';

type GlassVariant = 'default' | 'frost' | 'fresh' | 'warning' | 'danger';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
  hover?: boolean;
  animate?: boolean;
  staggerIndex?: number;
  accentBar?: GlassVariant | 'gray';
  onClick?: () => void;
  as?: 'div' | 'article' | 'section' | 'li';
}

const variantClasses: Record<GlassVariant, string> = {
  default: 'glass',
  frost:   'glass-frost',
  fresh:   'glass bg-fresh-50/65 border-fresh-200/60',
  warning: 'glass bg-warning-50/65 border-warning-200/60',
  danger:  'glass bg-danger-50/65 border-danger-200/60',
};

const accentClasses: Record<string, string> = {
  default: '',
  frost:   'accent-bar-frost',
  fresh:   'accent-bar-fresh',
  warning: 'accent-bar-warning',
  danger:  'accent-bar-danger',
  gray:    'accent-bar-gray',
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
        'rounded-2xl overflow-hidden',
        variantClasses[variant],
        accentBar && accentClasses[accentBar],
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-hover',
        animate && 'animate-fade-in-up',
        isInteractive && 'cursor-pointer focus-visible:ring-2 focus-visible:ring-frost-400/60',
        className,
      )}
      style={style}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {children}
    </Tag>
  );
}

export { GlassCard };
