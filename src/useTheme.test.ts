import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from './useTheme';

/**
 * localStorage is stubbed rather than taken from the environment. Node 26 installs its own
 * global `localStorage` that is inert unless the runtime was started with
 * --localstorage-file, and it shadows the one jsdom would otherwise provide, so neither the
 * bare global nor `window.localStorage` is usable here. A hand-rolled stub also lets the
 * failure case be driven directly.
 */
function stubStorage(setItem?: () => never) {
  const store = new Map<string, string>();
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
  document.documentElement.classList.remove('dark');
  vi.unstubAllGlobals();
});

describe('useTheme', () => {
  it('reads the initial theme off the class index.html already applied', () => {
    stubStorage();
    document.documentElement.classList.add('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');
  });

  it('defaults to light when the class is absent', () => {
    stubStorage();
    const { result } = renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });

  it('toggling sets the class, persists the choice and returns the new theme', () => {
    const storage = stubStorage();
    const { result } = renderHook(() => useTheme());

    act(() => result.current[1]());
    expect(result.current[0]).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(storage.getItem('theme')).toBe('dark');

    act(() => result.current[1]());
    expect(result.current[0]).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(storage.getItem('theme')).toBe('light');
  });

  // Private mode and blocked-cookie setups throw on write. The class still has to flip.
  it('still applies the theme when the write throws', () => {
    stubStorage(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useTheme());

    expect(() => act(() => result.current[1]())).not.toThrow();
    expect(result.current[0]).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
