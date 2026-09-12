export interface Movie {
  id: string;
  title: string;
  published: boolean;
  seen?: boolean;
  // Started but not finished (a long series, mostly). Takes precedence over `published`
  // and `seen`, so an entry carries it only while it is actually being watched.
  watching?: boolean;
  // Started and given up on, never finished. Wins over every other flag, so an entry that
  // was watched partway and abandoned leaves whatever tab it was in and carries no score.
  dropped?: boolean;
  tags: string[];
  national?: string;
  cover_image: string;
  release_date: string;
  watch_date: string;
  point: number;
  content: string;
  summary?: string;
  // Japanese rendering of `summary`, shown when the language switch is on JA. Optional:
  // an entry without one falls back to the English `summary`.
  summary_ja?: string;
  impression?: string;
  // Watchlist-only: streaming services the film was available on when last checked,
  // as keys into STREAMING_SERVICES. `checked` is the YYYY-MM that availability was
  // verified, surfaced next to the badges so a stale entry reads as stale.
  streaming?: string[];
  checked?: string;
}

/** Which language the movie summaries render in. See `useLanguage`. */
export type Language = 'en' | 'ja';

export type View =
  | 'watched'
  | 'watching'
  | 'watchlist'
  | 'seen'
  | 'dropped'
  | 'history'
  | 'stats';

export type SortKey =
  | 'watch_date_desc'
  | 'watch_date_asc'
  | 'release_date_desc'
  | 'release_date_asc'
  | 'point_desc'
  | 'point_asc';
