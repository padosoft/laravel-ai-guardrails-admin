import { X } from 'lucide-react';
import { type ReactNode, useEffect, useLayoutEffect, useRef } from 'react';

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
  // Keep onClose in a ref so the mount-only effect always calls the latest callback
  // without re-firing when callers pass new inline arrows on every render.
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
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
  // Empty deps: mount-only. onClose is accessed via onCloseRef to avoid re-firing
  // when parent re-renders (e.g. setSaving/setError) pass a new inline arrow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
