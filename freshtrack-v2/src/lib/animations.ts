export const fadeInUp = 'animate-fade-in-up';
export const fadeIn = 'animate-fade-in';
export const scaleIn = 'animate-scale-in';
export const slideInRight = 'animate-slide-in-right';
export const slideInLeft = 'animate-slide-in-left';
export const pulseGlow = 'animate-pulse-glow';
export const shimmer = 'animate-shimmer';
export const float = 'animate-float';

export const staggerDelay = (index: number, baseMs = 60) => ({
  animationDelay: `${index * baseMs}ms`,
  animationFillMode: 'both' as const,
});

export const transition = {
  default: 'transition-all duration-300 ease-out',
  fast: 'transition-all duration-150 ease-out',
  slow: 'transition-all duration-500 ease-out',
  spring: 'transition-all duration-400',
};

export const hover = {
  lift: 'hover:-translate-y-1 hover:shadow-glass-hover',
  scale: 'hover:scale-[1.02]',
  glow: 'hover:shadow-glow-frost',
  glowFresh: 'hover:shadow-glow-fresh',
  glowDanger: 'hover:shadow-glow-danger',
  dim: 'hover:opacity-80',
};

export const glass = {
  base: 'backdrop-blur-glass bg-white/60 border border-white/25 shadow-glass',
  frost: 'backdrop-blur-glass bg-frost-50/70 border border-frost-200/30 shadow-glow-frost',
  fresh: 'backdrop-blur-glass bg-fresh-50/70 border border-fresh-200/30 shadow-glow-fresh',
  warning: 'backdrop-blur-glass bg-warning-50/70 border border-warning-200/30',
  danger: 'backdrop-blur-glass bg-danger-50/70 border border-danger-200/30 shadow-glow-danger',
  dark: 'backdrop-blur-glass bg-slate-900/60 border border-white/10 shadow-glass',
};
