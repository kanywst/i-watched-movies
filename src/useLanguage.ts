import { useCallback, useState } from 'react';
import { Language } from './types';

const STORAGE_KEY = 'lang';

/**
 * Which language the movie summaries render in. English is the default and the only one
 * every entry is guaranteed to have; `summary_ja` is optional, so the modal falls back to
 * the English text per movie rather than this hook ever reporting a language the content
 * cannot serve.
 *
 * The localStorage write happens in the setter, not in the state updater, for the same
 * reason useTheme and useUrlState keep theirs out: the updater has to stay pure under
 * concurrent rendering. Unlike the theme there is no flash to avoid, because nothing is
 * painted before React's first commit reads this value.
 */
export function useLanguage(): [Language, (next: Language) => void] {
  const [lang, setLang] = useState<Language>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'ja' ? 'ja' : 'en';
    } catch {
      // Storage can be unavailable (private mode, blocked cookies); English is the default.
      return 'en';
    }
  });

  const setLanguage = useCallback((next: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session.
    }
    setLang(next);
  }, []);

  return [lang, setLanguage];
}
