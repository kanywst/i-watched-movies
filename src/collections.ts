import moviesData from './data/movies.json';
import type { Movie, View } from './types';
import { countGenres, countLogged, partitionMovies } from './partition';
import { buildRatedPoints } from './scoreBand';
import { podiumSteps, rankById } from './podium';
import { RANK_LIMIT } from './constants';

/**
 * The diary is a static JSON module baked at build time, so every partition of it is a
 * constant. Deriving them here rather than in App means the filters run once per page load
 * instead of once per component instance, and it removes a row of `useMemo(..., [allMovies])`
 * guards that were protecting against a dependency that could never change.
 *
 * This module is data only; the rules live in src/partition.ts, which is what the tests
 * cover (movies.json is a gitignored build artifact and CI tests before it is generated).
 */
export const ALL_MOVIES = moviesData as Movie[];

const PARTITIONS = partitionMovies(ALL_MOVIES);

export const WATCHED_MOVIES = PARTITIONS.watched;
export const WATCHING_MOVIES = PARTITIONS.watching;
export const WATCHLIST_MOVIES = PARTITIONS.watchlist;
export const SEEN_MOVIES = PARTITIONS.seen;
export const DROPPED_MOVIES = PARTITIONS.dropped;
export const HISTORY_MOVIES = PARTITIONS.history;

export const HISTORY_COUNT = countLogged(HISTORY_MOVIES);
export const SEEN_GENRE_COUNT = countGenres(SEEN_MOVIES);
export const WATCHING_GENRE_COUNT = countGenres(WATCHING_MOVIES);
export const DROPPED_GENRE_COUNT = countGenres(DROPPED_MOVIES);
// The Stats header's "Genres" figure. Equal to `computeTasteProfile(WATCHED_MOVIES).genres
// .length` (buildAffinities emits one entry per distinct tag), computed here so App can
// build that header without importing taste.ts, which lives behind the lazy TastePanel.
export const WATCHED_GENRE_COUNT = countGenres(WATCHED_MOVIES);

/**
 * Every rated score, ascending, which is the population a card's or the modal's score is
 * placed against. Not named for the 0-10 scale it is drawn from: this is the distribution,
 * which is the thing a band is cut out of.
 *
 * Built from the whole watched list rather than the current view, on the same rule as the
 * rank and NEW badges: filtering the grid must not move a film's standing. Imported directly
 * by the card and the modal instead of threaded down as a prop, since it is a module
 * constant either way and the modal takes only the movie.
 */
export const RATED_POINTS = buildRatedPoints(WATCHED_MOVIES);

/**
 * Tab badge counts. History counts entries with a usable watch_date rather than the raw list
 * length, and Stats deliberately shows none (its figure would only repeat Watched's), so
 * this cannot be read off the source lists alone.
 */
export const TAB_COUNTS: Record<View, number> = {
  watched: WATCHED_MOVIES.length,
  watching: WATCHING_MOVIES.length,
  watchlist: WATCHLIST_MOVIES.length,
  seen: SEEN_MOVIES.length,
  dropped: DROPPED_MOVIES.length,
  history: HISTORY_COUNT,
  stats: 0,
};

/**
 * The Watched view's podium and the rank marker on each grid card, both off the whole
 * watched list for the reason RATED_POINTS gives: a film's place must not move because the
 * grid is filtered. Tie handling lives in src/podium.ts.
 */
export const PODIUM = podiumSteps(WATCHED_MOVIES, RANK_LIMIT);
export const MOVIE_RANKS = rankById(PODIUM);
