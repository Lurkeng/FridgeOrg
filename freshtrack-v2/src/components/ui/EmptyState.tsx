import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, description, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative mx-auto max-w-md border border-dashed border-[rgba(21,19,15,0.32)] bg-[var(--ft-paper)]/40 px-8 py-16 text-center",
        className,
      )}
    >
      {/* corner ticks — editorial registration marks */}
      <span aria-hidden className="absolute left-0 top-0 h-3 w-3 border-l border-t border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute right-0 top-0 h-3 w-3 border-r border-t border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-[var(--ft-ink)]" />

      <div className="mb-5 inline-block animate-float text-6xl">{icon}</div>
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--ft-signal)]">
        Empty shelf
      </p>
      <h3 className="font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-[var(--ft-ink)] [text-wrap:balance]">
        {title}
      </h3>
      {description && (
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[rgba(21,19,15,0.62)]">
          {description}
        </p>
      )}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
