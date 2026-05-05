interface LegalBlockProps {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}

export function LegalBlock({ title, kicker, children }: LegalBlockProps) {
  return (
    <section className="border-t border-[var(--ft-ink)] pt-4">
      {kicker && (
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">
          {kicker}
        </p>
      )}
      <h2 className="font-display text-lg font-bold tracking-[-0.02em]">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-[rgba(21,19,15,0.72)]">{children}</div>
    </section>
  );
}
