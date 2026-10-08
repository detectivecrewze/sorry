export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(label: string, className = 'ui-button'): HTMLButtonElement {
  const node = el('button', className, label);
  node.type = 'button';
  return node;
}

export function field(label: string, input: HTMLElement, hint = ''): HTMLLabelElement {
  const root = el('label', 'form-field');
  root.append(el('span', 'form-field__label', label), input);
  if (hint) root.append(el('small', 'form-field__hint', hint));
  return root;
}

export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function formatDate(value: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function setBusy(buttonNode: HTMLButtonElement, busy: boolean, busyLabel = 'Memproses…'): void {
  if (busy) {
    buttonNode.dataset.originalLabel = buttonNode.textContent || '';
    buttonNode.textContent = busyLabel;
    buttonNode.disabled = true;
  } else {
    buttonNode.textContent = buttonNode.dataset.originalLabel || buttonNode.textContent;
    buttonNode.disabled = false;
  }
}

export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const focusable = [...container.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter((node) => !node.hidden && node.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
