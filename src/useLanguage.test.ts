import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLanguage } from './useLanguage';

/** Same stub as useTheme.test.ts, and for the same reason: see the note there. */
function stubStorage(initial?: string, setItem?: () => never) {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set('lang', initial);
  const fake = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: setItem ?? ((k: string, v: string) => void store.set(k, v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', fake);
  return fake;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLanguage', () => {
  it('defaults to English with nothing stored', () => {
    stubStorage();
    const { result } = renderHook(() => useLanguage());
    expect(result.current[0]).toBe('en');
  });

  it('restores a stored Japanese choice', () => {
    stubStorage('ja');
    const { result } = renderHook(() => useLanguage());
    expect(result.current[0]).toBe('ja');
  });

  it('falls back to English on an unrecognised stored value', () => {
    stubStorage('fr');
    const { result } = renderHook(() => useLanguage());
    expect(result.current[0]).toBe('en');
  });

  it('setting the language persists the choice', () => {
    const storage = stubStorage();
    const { result } = renderHook(() => useLanguage());

    act(() => result.current[1]('ja'));
    expect(result.current[0]).toBe('ja');
    expect(storage.getItem('lang')).toBe('ja');

    act(() => result.current[1]('en'));
    expect(result.current[0]).toBe('en');
    expect(storage.getItem('lang')).toBe('en');
  });

  it('still switches when localStorage throws', () => {
    stubStorage(undefined, () => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useLanguage());
    act(() => result.current[1]('ja'));
    expect(result.current[0]).toBe('ja');
  });

  it('reads English when localStorage is unavailable entirely', () => {
    vi.stubGlobal('localStorage', undefined);
    const { result } = renderHook(() => useLanguage());
    expect(result.current[0]).toBe('en');
  });
});
