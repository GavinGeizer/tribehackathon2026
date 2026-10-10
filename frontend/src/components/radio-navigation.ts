import type { KeyboardEvent } from 'react';

export function navigateRadioGroup(event: KeyboardEvent<HTMLElement>) {
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
  if (!forward && !backward && event.key !== 'Home' && event.key !== 'End') return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0 || buttons.length === 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (forward ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.click();
  buttons[next]?.focus();
}
