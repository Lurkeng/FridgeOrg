import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

// Warm parchment input — sharp border, pickle focus ring, no rounded glass.
const baseInput =
  'w-full bg-[var(--ft-paper)] border border-[var(--ft-ink)] px-4 py-2.5 text-sm text-[var(--ft-ink)] placeholder:text-[rgba(21,19,15,0.42)] ' +
  'transition-all duration-150 outline-none ' +
  'focus:bg-[var(--ft-bone)] focus:shadow-[2px_2px_0_var(--ft-ink)] focus:-translate-y-px ' +
  'hover:bg-[var(--ft-bone)]';

const labelClass =
  'font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--ft-ink)]';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, fullWidth, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className={labelClass}>
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-3 flex-shrink-0 text-[rgba(21,19,15,0.46)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseInput,
              icon && 'pl-10',
              iconRight && 'pr-10',
              error && 'border-[var(--ft-signal)] bg-[rgba(184,50,30,0.06)]',
              className,
            )}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 flex-shrink-0 text-[rgba(21,19,15,0.46)]">{iconRight}</span>
          )}
        </div>
        {error && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ft-signal)]">
            ↳ {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs leading-snug text-[rgba(21,19,15,0.54)]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className={labelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            baseInput,
            'resize-none leading-relaxed',
            error && 'border-[var(--ft-signal)] bg-[rgba(184,50,30,0.06)]',
            className,
          )}
          {...props}
        />
        {error && (
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ft-signal)]">
            ↳ {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs leading-snug text-[rgba(21,19,15,0.54)]">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export default Input;
