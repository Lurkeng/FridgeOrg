import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  /** Small uppercase kicker above the title. Defaults to a section label inferred from `title`. */
  eyebrow?: string;
}

export function PageHeader({ title, subtitle, actions, className, icon, eyebrow }: PageHeaderProps) {
  const kicker = eyebrow ?? 'Section';
  return (
    <header
      className={cn(
        'page-header relative mb-10 animate-fade-in-up border-b border-[var(--ft-ink)] pb-6',
        className,
      )}
    >
      {/* Editorial rule + kicker */}
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px w-8 bg-[var(--ft-ink)]" aria-hidden />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">
          {kicker}
        </p>
        <span className="h-px flex-1 bg-[rgba(21,19,15,0.18)]" aria-hidden />
      </div>

      <div className="flex items-end justify-between gap-6">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <div
              className={cn(
                'page-header-icon flex h-12 w-12 flex-shrink-0 items-center justify-center',
                'border border-[var(--ft-ink)] bg-[var(--ft-paper)]',
                'shadow-[2px_2px_0_var(--ft-ink)] translate-y-1',
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(2rem,4.6vw,4.25rem)] font-bold leading-[0.92] tracking-[-0.035em] text-[var(--ft-ink)] [text-wrap:balance]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 max-w-xl text-[13px] font-medium leading-relaxed text-[rgba(21,19,15,0.64)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 self-end stagger-2 animate-fade-in pb-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
