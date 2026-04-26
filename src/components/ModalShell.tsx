import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  overlayClassName?: string;
  panelClassName?: string;
  bodyClassName?: string;
}

export default function ModalShell({
  title,
  subtitle,
  icon,
  children,
  footer,
  onClose,
  maxWidth = 'md:max-w-4xl',
  overlayClassName = 'bg-black/60 backdrop-blur-sm',
  panelClassName = '',
  bodyClassName = '',
}: ModalShellProps) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-4 ${overlayClassName}`}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 18 }}
        transition={{ duration: 0.18 }}
        className={`relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[90dvh] ${maxWidth} md:rounded-[40px] ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-30 flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 md:px-8 md:py-5">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white bg-primary/10 text-primary shadow-inner md:h-11 md:w-11">
                {icon}
              </div>
            )}
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-xl font-bold leading-tight tracking-tight text-foreground md:text-2xl">
                {title}
              </h2>
              {subtitle && (
                <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border-2 border-white bg-gray-50 p-2 text-foreground/25 shadow-sm transition-all hover:border-primary/20 hover:bg-white hover:text-primary hover:shadow-md md:rounded-2xl md:p-3"
            aria-label="Close popup"
          >
            <X className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-white ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-white p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.08)] md:px-8 md:py-5">
            {footer}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  );
}
