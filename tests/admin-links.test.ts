import { describe, expect, it } from 'vitest';
import { projectLinkForCurrentApp } from '../src/admin/projectLinks';

describe('Admin project links', () => {
  const studioUrl = 'https://sorry.for-you-always.my.id/studio/sorry-123#token=magic-token';

  it('keeps the canonical URL outside local development', () => {
    expect(projectLinkForCurrentApp(studioUrl, 'https://sorry.for-you-always.my.id', false)).toBe(studioUrl);
  });

  it('keeps the project path and magic token but opens the local app during development', () => {
    expect(projectLinkForCurrentApp(studioUrl, 'http://127.0.0.1:5173', true))
      .toBe('http://127.0.0.1:5173/studio/sorry-123#token=magic-token');
  });
});
