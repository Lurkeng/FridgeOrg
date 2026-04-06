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
    <div className={cn('flex items-start justify-between gap-4 mb-8 animate-fade-in-up', className)}>
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-11 h-11 rounded-2xl glass flex items-center justify-center shadow-glass flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5 font-medium truncate">{subtitle}</p>}
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
