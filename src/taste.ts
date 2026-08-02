import type { Movie } from './types';
import {
  AFFINITY_PRIOR,
  COUNTRY_AFFINITY_WEIGHT,
  MIN_AFFINITY_SAMPLE,
  MIN_DRIFT_SAMPLE,
  NEW_RELEASE_WINDOW_DAYS,
  OUTLIER_SIGMA,
  REASON_LIMIT,
  SCORE_BUCKET_STEP,
} from './constants';

/**
 * Taste analysis for the Stats view: what the ratings say about what gets watched, how the
 * scoring scale is actually used, and which watchlist entries fit the profile best.
 *
 * Kept apart from `stats.ts` on purpose: that module holds the cheap header counters every
 * view needs, this one is the derived analysis only the Stats view pulls in.
 *
 * Every function here is pure and takes the already-filtered movie list, so "watched" means
 * `published && !seen` (rated films) and "watchlist" means `!published && !seen`.
 */

const DAY_MS = 86_400_000;
const BUCKET_COUNT = Math.round(10 / SCORE_BUCKET_STEP);

/** Epoch ms for an ISO date, or null when the field is empty or malformed. */
function dayMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Population standard deviation (the whole diary is the population, not a sample of it). */
function stdev(xs: number[], m: number): number {
  if (xs.length === 0) return 0;
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export interface Affinity {
  /** Genre name, country, or era label. */
  key: string;
  count: number;
  average: number;
  /** average minus the overall baseline. Positive = rated above the personal average. */
  delta: number;
}

/**
 * Group the rated films by whatever keys `keysOf` pulls out and score each group against
 * the baseline. Sorted by sample size first so the display leads with the solid signals.
 */
function buildAffinities(
  movies: Movie[],
  keysOf: (m: Movie) => string[],
  baseline: number,
): Affinity[] {
  const groups = new Map<string, number[]>();
  for (const m of movies) {
    for (const key of keysOf(m)) {
      const bucket = groups.get(key);
      if (bucket) bucket.push(m.point);
      else groups.set(key, [m.point]);
    }
  }
  return [...groups.entries()]
    .map(([key, points]) => {
      const average = mean(points);
      return { key, count: points.length, average, delta: average - baseline };
    })
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function eraOf(movie: Movie): string[] {
  const ms = dayMs(movie.release_date);
  if (ms === null) return [];
  return [`${Math.floor(new Date(ms).getUTCFullYear() / 10) * 10}s`];
}

export interface TasteProfile {
  total: number;
  /** Mean rating. Every delta on this page is measured against it. */
  baseline: number;
  median: number;
  spread: number;
  genres: Affinity[];
  countries: Affinity[];
  eras: Affinity[];
  /** Median days from release to watch. null when no film has both dates. */
  medianLagDays: number | null;
  /** Share (0-1) of films caught within NEW_RELEASE_WINDOW_DAYS of release. */
  newReleaseShare: number;
}

export function computeTasteProfile(movies: Movie[]): TasteProfile {
  const points = movies.map(m => m.point);
  const baseline = mean(points);

  const lags: number[] = [];
  let fresh = 0;
  for (const m of movies) {
    const released = dayMs(m.release_date);
    const watched = dayMs(m.watch_date);
    if (released === null || watched === null) continue;
    const lag = (watched - released) / DAY_MS;
    lags.push(lag);
    // Negative lag = a preview screening, which is as "on release" as it gets.
    if (lag <= NEW_RELEASE_WINDOW_DAYS) fresh += 1;
  }

  return {
    total: movies.length,
    baseline,
    median: median(points),
    spread: stdev(points, baseline),
    genres: buildAffinities(movies, m => m.tags, baseline),
    countries: buildAffinities(movies, m => (m.national ? [m.national] : []), baseline),
    eras: buildAffinities(movies, eraOf, baseline),
    medianLagDays: lags.length ? Math.round(median(lags)) : null,
    newReleaseShare: lags.length ? fresh / lags.length : 0,
  };
}

export interface ScoreBucket {
  /** Inclusive lower bound of the bucket, e.g. 7.5 for the 7.5-8.0 band. */
  start: number;
  count: number;
}

export interface ScoreDrift {
  earlier: number;
  later: number;
  /** later minus earlier. Positive = scores have crept up over time. */
  delta: number;
}

export interface ScoringHabits {
  buckets: ScoreBucket[];
  lowest: Movie | null;
  highest: Movie | null;
  /** Share (0-1) of ratings sitting within SCORE_BUCKET_STEP of the mean. */
  concentration: number;
  mostGenerous: Affinity | null;
  harshest: Affinity | null;
  /** Ratings at least OUTLIER_SIGMA standard deviations off the mean, furthest first. */
  outliers: Movie[];
  /** First half vs second half of the diary, chronologically. null when too few films. */
  drift: ScoreDrift | null;
}

function computeDrift(movies: Movie[]): ScoreDrift | null {
  const dated = movies
    .map(m => ({ at: dayMs(m.watch_date), point: m.point }))
    .filter((m): m is { at: number; point: number } => m.at !== null)
    .sort((a, b) => a.at - b.at);
  if (dated.length < MIN_DRIFT_SAMPLE) return null;
  const mid = dated.length >> 1;
  const earlier = mean(dated.slice(0, mid).map(m => m.point));
  const later = mean(dated.slice(mid).map(m => m.point));
  return { earlier, later, delta: later - earlier };
}

/** `profile` must be the one built from this same list, since every delta is read off it. */
export function computeScoringHabits(movies: Movie[], profile: TasteProfile): ScoringHabits {
  const buckets: ScoreBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
    start: i * SCORE_BUCKET_STEP,
    count: 0,
  }));
  let concentrated = 0;
  let lowest: Movie | null = null;
  let highest: Movie | null = null;

  for (const m of movies) {
    // A perfect 10 would fall off the end of the array, so it shares the top band.
    const index = clamp(Math.floor(m.point / SCORE_BUCKET_STEP), 0, BUCKET_COUNT - 1);
    buckets[index].count += 1;
    if (Math.abs(m.point - profile.baseline) <= SCORE_BUCKET_STEP) concentrated += 1;
    if (!lowest || m.point < lowest.point) lowest = m;
    if (!highest || m.point > highest.point) highest = m;
  }

  // Comparing a one-film genre against a fifteen-film one is not a comparison, so the
  // generous/harsh call only looks at genres with a real sample, and needs two of them.
  const solid = profile.genres.filter(a => a.count >= MIN_AFFINITY_SAMPLE);
  const ranked = [...solid].sort((a, b) => b.delta - a.delta);
  const hasContrast = ranked.length >= 2;

  const outliers =
    profile.spread > 0
      ? movies
          .filter(m => Math.abs(m.point - profile.baseline) >= OUTLIER_SIGMA * profile.spread)
          .sort(
            (a, b) =>
              Math.abs(b.point - profile.baseline) - Math.abs(a.point - profile.baseline),
          )
      : [];

  return {
    buckets,
    lowest,
    highest,
    concentration: movies.length ? concentrated / movies.length : 0,
    mostGenerous: hasContrast ? ranked[0] : null,
    harshest: hasContrast ? ranked[ranked.length - 1] : null,
    outliers,
    drift: computeDrift(movies),
  };
}

export interface RecommendationReason {
  key: string;
  /** Signed points this key added to (or took off) the prediction. */
  contribution: number;
}

export interface Recommendation {
  movie: Movie;
  /** Baseline plus the shrunk genre and country deltas, clamped to the 0-10 scale. */
  predicted: number;
  reasons: RecommendationReason[];
}

/** Pull a small-sample delta back toward the baseline before trusting it. */
const shrink = (a: Affinity) => a.delta * (a.count / (a.count + AFFINITY_PRIOR));

function genreHits(movie: Movie, genreIndex: Map<string, Affinity>): Affinity[] {
  return movie.tags.map(t => genreIndex.get(t)).filter((a): a is Affinity => a !== undefined);
}

/**
 * The genre half of a prediction. Averaged, not summed, so a five-genre entry is not
 * mechanically ranked above a two-genre one just for carrying more tags.
 */
function genrePull(movie: Movie, genreIndex: Map<string, Affinity>): number {
  const hits = genreHits(movie, genreIndex);
  return hits.length ? mean(hits.map(shrink)) : 0;
}

/**
 * How this country's films score once genre is already accounted for, measured on the
 * rated films of that country that overlap the candidate's tags.
 *
 * `profile.countries` is a flat per-country average, which is the right thing to display
 * but the wrong thing to predict with: it mixes every genre the diary covers, so it charges
 * a film for its passport rather than its content. Japanese crime and mystery entries
 * average well above the personal baseline while Japanese comedy and period pieces pull the
 * country mean below it, and scoring a Japanese thriller against that mean applies a penalty
 * earned by an unrelated comedy. Restricting the slice to tag-overlapping films measures the
 * interaction that actually matters, and taking the residual against each film's own genre
 * prediction keeps the term from paying out the genre bonus a second time.
 *
 * Falls back to the whole-country slice when the genre-matched one is below
 * MIN_AFFINITY_SAMPLE, and returns null when the country has no rated films at all.
 */
function countryAffinity(
  movie: Movie,
  rated: Movie[],
  genreIndex: Map<string, Affinity>,
  baseline: number,
): Affinity | null {
  if (!movie.national) return null;
  const sameCountry = rated.filter(m => m.national === movie.national);
  if (sameCountry.length === 0) return null;

  const matched = sameCountry.filter(m => m.tags.some(t => movie.tags.includes(t)));
  const slice = matched.length >= MIN_AFFINITY_SAMPLE ? matched : sameCountry;
  const delta = mean(slice.map(m => m.point - (baseline + genrePull(m, genreIndex))));
  return { key: movie.national, count: slice.length, average: baseline + delta, delta };
}

/**
 * Rank watchlist entries by how well they match the rated profile. This predicts how the
 * film would be scored, not how good it is: an untagged entry or one whose genres have
 * never been rated simply lands on the baseline.
 *
 * `rated` must be the same list the profile was built from, as with computeScoringHabits.
 */
export function recommendWatchlist(
  watchlist: Movie[],
  rated: Movie[],
  profile: TasteProfile,
  limit: number,
): Recommendation[] {
  const genreIndex = new Map(profile.genres.map(a => [a.key, a]));

  return watchlist
    .map((movie): Recommendation => {
      const reasons: RecommendationReason[] = [];

      const hits = genreHits(movie, genreIndex);
      const genrePart = genrePull(movie, genreIndex);
      for (const a of hits) reasons.push({ key: a.key, contribution: shrink(a) / hits.length });

      const country = countryAffinity(movie, rated, genreIndex, profile.baseline);
      const countryPart = country ? shrink(country) * COUNTRY_AFFINITY_WEIGHT : 0;
      if (country) reasons.push({ key: country.key, contribution: countryPart });

      // Strongest pull first regardless of sign, so a low rank explains itself too.
      reasons.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      return {
        movie,
        predicted: clamp(profile.baseline + genrePart + countryPart, 0, 10),
        reasons: reasons.slice(0, REASON_LIMIT),
      };
    })
    .sort((a, b) => b.predicted - a.predicted || a.movie.title.localeCompare(b.movie.title))
    .slice(0, limit);
}
