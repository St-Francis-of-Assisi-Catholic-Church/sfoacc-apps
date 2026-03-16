import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'secondary';
  children: React.ReactNode;
}

export function Badge({
  className = '',
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variants = {
    default: 'bg-olive/10 text-olive',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    destructive: 'bg-red-100 text-red-700',
    outline: 'border border-border bg-background text-foreground',
    secondary: 'bg-muted text-muted-foreground',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
