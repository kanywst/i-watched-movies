import type { Movie } from './types';

export interface AlternateTitle {
  lang: 'en' | 'ja';
  text: string;
}

/**
 * The English and Japanese release titles to print under a film's original title, in
 * that order. One is left out when it is empty or reads the same as a name already shown,
 * so an American film shows only its Japanese title, and a Japanese one usually nothing.
 */
export function alternateTitles(movie: Pick<Movie, 'title' | 'title_en' | 'title_ja'>): AlternateTitle[] {
  const shown = [movie.title.trim()];
  const out: AlternateTitle[] = [];
  for (const [lang, raw] of [['en', movie.title_en], ['ja', movie.title_ja]] as const) {
    const text = (raw ?? '').trim();
    if (!text || shown.includes(text)) continue;
    shown.push(text);
    out.push({ lang, text });
  }
  return out;
}
