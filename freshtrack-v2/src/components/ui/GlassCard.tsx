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
  fresh:   'backdrop-blur-glass bg-fresh-50/65 border border-fresh-200/35',
  warning: 'backdrop-blur-[12px] bg-warning-50/65 border border-warning-200/35',
  danger:  'backdrop-blur-[12px] bg-danger-50/65 border border-danger-200/35',
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

  return (
    <Tag
      className={cn(
        'rounded-2xl overflow-hidden',
        variantClasses[variant],
        accentBar && accentClasses[accentBar],
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-hover',
        animate && 'animate-fade-in-up',
        onClick && 'cursor-pointer',
        className,
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

export { GlassCard };
