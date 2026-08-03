import moviesData from './data/movies.json';
import type { Movie, View } from './types';
import { isValidWatchDate } from './activity';

/**
 * The diary is a static JSON module baked at build time, so every partition of it is a
 * constant. Deriving them here rather than in App means the filters run once per page load
 * instead of once per component instance, and it removes a row of `useMemo(..., [allMovies])`
 * guards that were protecting against a dependency that could never change.
 */
export const ALL_MOVIES = moviesData as Movie[];

/**
 * `seen` (watched but deliberately unrated) is its own axis: it is excluded from both the
 * rated Watched grid and the to-watch Watchlist so those counts and stats stay honest.
 */
export const WATCHED_MOVIES = ALL_MOVIES.filter(m => m.published && !m.seen);
export const WATCHLIST_MOVIES = ALL_MOVIES.filter(m => !m.published && !m.seen);
export const SEEN_MOVIES = ALL_MOVIES.filter(m => m.seen);

/**
 * Viewing history spans everything actually watched (rated + `seen`), keyed by watch_date.
 * Watchlist entries are excluded up front so a stray placeholder date could never leak in;
 * computeActivity also drops empty and invalid dates, but the intent is clearer here.
 */
export const HISTORY_MOVIES = ALL_MOVIES.filter(m => m.published || m.seen);

/** Entries whose watch_date is usable, which is what the History tab badge counts. */
export const HISTORY_COUNT = HISTORY_MOVIES.filter(m => isValidWatchDate(m.watch_date)).length;

export const SEEN_GENRE_COUNT = new Set(SEEN_MOVIES.flatMap(m => m.tags)).size;

/**
 * Tab badge counts. History counts entries with a usable watch_date rather than the raw list
 * length, and Stats deliberately shows none (its figure would only repeat Watched's), so
 * this cannot be read off the source lists alone.
 */
export const TAB_COUNTS: Record<View, number> = {
  watched: WATCHED_MOVIES.length,
  watchlist: WATCHLIST_MOVIES.length,
  seen: SEEN_MOVIES.length,
  history: HISTORY_COUNT,
  stats: 0,
};
