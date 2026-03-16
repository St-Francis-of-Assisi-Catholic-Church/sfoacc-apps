import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** max-width class, defaults to 'max-w-lg' */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  /** Slot for footer actions */
  footer?: React.ReactNode;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export function Modal({ open, onClose, title, description, size = 'md', children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={`
          bg-card border border-border shadow-2xl w-full ${SIZE[size]}
          rounded-t-2xl sm:rounded-2xl
          flex flex-col
          max-h-[92dvh] sm:max-h-[85dvh]
          animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-foreground text-base leading-tight">{title}</h2>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 rounded-md p-0.5 hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0 bg-muted/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
