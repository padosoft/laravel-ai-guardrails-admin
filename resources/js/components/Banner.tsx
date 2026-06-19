import { Eye, Info } from 'lucide-react';

interface BannerProps {
  kind?: 'info' | 'warn';
  icon?: 'eye' | 'info';
  children: React.ReactNode;
  testId?: string;
}

export function Banner({ kind = 'warn', icon, children, testId }: BannerProps) {
  const effectiveIcon = icon ?? (kind === 'info' ? 'info' : 'warn');
  return (
    <div className={`banner${kind === 'info' ? ' info' : ''}`} data-testid={testId}>
      <span className="bn-icon">
        {effectiveIcon === 'eye' ? <Eye size={17} /> : <Info size={17} />}
      </span>
      <span className="bn-text">{children}</span>
    </div>
  );
}
