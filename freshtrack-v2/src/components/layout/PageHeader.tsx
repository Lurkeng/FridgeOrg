import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, className, icon }: PageHeaderProps) {
  return (
    <div className={cn('page-header flex items-start justify-between gap-4 mb-8 animate-fade-in-up border-b border-[var(--ft-ink)] pb-5', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <div className="page-header-icon flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">FreshTrack</p>
          <h1 className="mt-1 text-[clamp(2rem,5vw,4.75rem)] font-black leading-[0.88] tracking-[-0.055em] text-[var(--ft-ink)]">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-sm font-medium leading-snug text-[rgba(21,19,15,0.64)]">{subtitle}</p>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 stagger-2 animate-fade-in">
          {actions}
        </div>
      )}
    </div>
  );
}
