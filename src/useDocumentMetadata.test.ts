import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentMetadata } from './useDocumentMetadata';

describe('useDocumentMetadata', () => {
  it('sets document title', () => {
    renderHook(() => useDocumentMetadata('Test Title', 'https://example.com/icon.png'));
    expect(document.title).toBe('Test Title');
  });

  it('creates a favicon link if none exists', () => {
    document.head.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
    renderHook(() => useDocumentMetadata('T', 'https://example.com/a.png'));
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    expect(link).not.toBeNull();
    expect(link?.href).toBe('https://example.com/a.png');
  });

  it('reuses existing favicon link', () => {
    document.head.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
    const existing = document.createElement('link');
    existing.rel = 'icon';
    existing.href = 'https://example.com/old.png';
    document.head.appendChild(existing);

    renderHook(() => useDocumentMetadata('T', 'https://example.com/new.png'));

    const links = document.querySelectorAll("link[rel*='icon']");
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toBe('https://example.com/new.png');
  });

  it('updates when title changes', () => {
    const { rerender } = renderHook(
      ({ t }: { t: string }) => useDocumentMetadata(t, 'https://example.com/x.png'),
      { initialProps: { t: 'First' } },
    );
    expect(document.title).toBe('First');
    rerender({ t: 'Second' });
    expect(document.title).toBe('Second');
  });
});
