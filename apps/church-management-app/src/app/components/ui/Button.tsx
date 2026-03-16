import { forwardRef, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-navy/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      default:     'bg-navy text-white hover:bg-navy-light shadow-sm',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
      success:     'bg-green-600 text-white hover:bg-green-700 shadow-sm',
      warning:     'bg-amber-500 text-white hover:bg-amber-600 shadow-sm',
      outline:     'border border-border bg-background hover:bg-muted hover:border-navy/40 text-foreground',
      ghost:       'hover:bg-muted hover:text-foreground text-foreground',
      link:        'text-navy hover:text-navy-light underline-offset-4 hover:underline',
    };

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-6 py-4 text-lg',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
