import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchFieldProps) {
  return (
    <div className={cn("group relative", className)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(21,19,15,0.46)] transition-colors group-focus-within:text-[var(--ft-ink)]"
        strokeWidth={1.75}
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full border border-[var(--ft-ink)] bg-[var(--ft-paper)] py-3 pl-11 pr-11 text-sm text-[var(--ft-ink)]",
          "placeholder:font-mono placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.18em] placeholder:text-[rgba(21,19,15,0.40)]",
          "outline-none transition-all duration-150",
          "focus:bg-[var(--ft-bone)] focus:shadow-[3px_3px_0_var(--ft-ink)] focus:-translate-y-px",
          "hover:bg-[var(--ft-bone)]",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center border border-[var(--ft-ink)] bg-[var(--ft-bone)] text-[var(--ft-ink)] transition-all hover:bg-[var(--ft-signal)] hover:text-[var(--ft-bone)] hover:rotate-90"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}
