import { X } from 'lucide-react';
import { type ReactNode, useEffect, useRef } from 'react';

interface DrawerProps {
  title: string;
  sub?: string;
  badge?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ title, sub, badge, onClose, children, footer }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && ref.current) {
        const focusable = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      const btn = ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea');
      btn?.focus();
    }, 60);

    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div
        className="drawer"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="agr-drawer"
      >
        <div className="drawer-head">
          <div className="grow">
            <div className="flex items-center gap-10">
              <span className="dh-title">{title}</span>
              {badge}
            </div>
            {sub && <div className="dh-sub">{sub}</div>}
          </div>
          <button
            className="btn btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </>
  );
}
