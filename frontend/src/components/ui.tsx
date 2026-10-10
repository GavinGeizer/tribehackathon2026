import type { ReactNode } from 'react';
import { Icons } from './icons';

export function Badge({
  tone,
  children,
}: {
  tone: 'synthetic' | 'teal' | 'navy' | 'amber' | 'red' | 'grey' | 'outline';
  children: ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SyntheticBadge() {
  return (
    <span className="badge badge-synthetic" title="Demonstration data — not a real submission">
      <Icons.Sparkles size={12} strokeWidth={2.5} aria-hidden />
      Synthetic
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" role="alert">
      {message}
    </p>
  );
}
