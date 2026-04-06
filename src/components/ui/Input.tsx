'use client';

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

const baseInput =
  'w-full glass rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'transition-all duration-200 outline-none ' +
  'focus:ring-2 focus:ring-frost-400/50 focus:border-frost-300/60 focus:bg-white/80 ' +
  'hover:bg-white/75 hover:border-white/40';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, fullWidth, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-slate-400 flex-shrink-0 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(baseInput, icon && 'pl-9', iconRight && 'pr-9', error && 'ring-2 ring-danger-300 border-danger-200', className)}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 text-slate-400 flex-shrink-0">
              {iconRight}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-danger-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, fullWidth, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className={cn('flex flex-col gap-1', fullWidth && 'w-full')}>
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(baseInput, 'resize-none', error && 'ring-2 ring-danger-300', className)}
          {...props}
        />
        {error && <p className="text-xs text-danger-600 font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export default Input;
