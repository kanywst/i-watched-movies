import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Light/dark toggle. The initial value is read off the `dark` class that index.html's inline
 * script has already applied, so this hook never causes a flash by re-deciding on mount.
 *
 * The class and localStorage writes happen in the event handler, not in the state updater:
 * the updater has to stay pure for concurrent rendering, the same rule useUrlState follows
 * for its history writes. An effect would work too but would only delay the change by a
 * frame, and the theme lives on `document.documentElement`, outside React's tree, so there
 * is nothing for React to reconcile.
 */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light',
  );

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); the class still applies.
    }
    setTheme(next);
  }, [theme]);

  return [theme, toggleTheme];
}
