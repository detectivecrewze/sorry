const prefix = 'sorry-letter:studio-token:';

function readFragmentToken(): string {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return fragment.get('token')?.trim() || '';
}

export function resolveStudioToken(projectId: string): string {
  const storageKey = `${prefix}${projectId}`;
  const fragmentToken = readFragmentToken();
  if (fragmentToken) {
    localStorage.setItem(storageKey, fragmentToken);
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    return fragmentToken;
  }
  return localStorage.getItem(storageKey)?.trim() || '';
}

export function forgetStudioToken(projectId: string): void {
  localStorage.removeItem(`${prefix}${projectId}`);
}
