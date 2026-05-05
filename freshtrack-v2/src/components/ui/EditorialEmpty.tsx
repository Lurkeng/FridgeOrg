import type { ReactNode } from "react";

/**
 * Editorial empty-state — brutalist newspaper-style placeholder used across
 * inventory, shopping, deals, and recipe pages. Corner registration ticks,
 * mono kicker, Lora display title, optional CTA in `children`.
 *
 * `icon` accepts either a string (HTML entity / emoji rendered via
 * dangerouslySetInnerHTML for compound emojis) or a ReactNode (e.g. a
 * lucide icon component).
 */
export default function EditorialEmpty({
  icon,
  kicker,
  title,
  body,
  children,
}: {
  icon: string | ReactNode;
  kicker: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <article className="relative border border-[var(--ft-ink)] bg-[var(--ft-paper)] text-center py-14 px-8 animate-scale-in">
      <span aria-hidden className="absolute top-3 left-3 h-3 w-3 border-l border-t border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute top-3 right-3 h-3 w-3 border-r border-t border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-l border-b border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-r border-b border-[var(--ft-ink)]" />
      {typeof icon === "string" ? (
        <div
          className="text-5xl mb-4 inline-block"
          dangerouslySetInnerHTML={{ __html: icon }}
        />
      ) : (
        <div className="text-5xl mb-4 inline-flex items-center justify-center">
          {icon}
        </div>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)] mb-2">
        {kicker}
      </p>
      <h3 className="font-display text-2xl text-[var(--ft-ink)] mb-2 leading-tight">
        {title}
      </h3>
      <p className="font-sans text-sm text-[rgba(21,19,15,0.65)] max-w-sm mx-auto">
        {body}
      </p>
      {children && <div className="mt-6 inline-block">{children}</div>}
    </article>
  );
}
