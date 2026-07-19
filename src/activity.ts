import type { Movie } from './types';
import { ACTIVITY_LEVEL_THRESHOLDS, ACTIVITY_WEEKS } from './constants';

/**
 * "Viewing history" heatmap, GitHub-contribution-graph style but tuned for a sparse
 * personal dataset. All date math is done in UTC so it is DST/timezone stable and the
 * pure functions here are unit-testable with a fixed `now`.
 */

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  /** ISO 'YYYY-MM-DD'. */
  date: string;
  count: number;
  level: ActivityLevel;
  /** Films watched that day, newest-point first, for the tooltip. */
  movies: Movie[];
}

export interface MonthlyCount {
  /** 'YYYY-MM'. */
  key: string;
  /** Short month label, e.g. 'Jul'. */
  label: string;
  count: number;
}

export interface ActivitySummary {
  /** Column-major: one entry per week (oldest left), each a 7-slot Sun..Sat column. */
  weeks: (ActivityDay | null)[][];
  /** Sparse month labels keyed by week (column) index. */
  monthLabels: { index: number; label: string }[];
  /** Films watched inside the visible range. */
  total: number;
  /** Distinct days with at least one film inside the range. */
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
  /** Consecutive days ending today (0 if today has no film). */
  currentStreak: number;
  /** Longest run of consecutive days with a film, over the whole history. */
  longestStreak: number;
  /** Trailing 12 calendar months, oldest first. */
  monthly: MonthlyCount[];
  rangeStart: string;
  rangeEnd: string;
}

const DAY_MS = 86_400_000;
// Minimum columns (weeks) between adjacent month labels so they never overlap in the SVG.
const MONTH_LABEL_MIN_GAP = 2;
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// `parseMovie` normalises watch_date to a full ISO datetime ('2026-07-19T00:00:00.000Z'),
// so match the leading date prefix rather than anchoring the whole string. Exported so the
// "films logged" count and the heatmap agree on what counts as a real watch date.
export const isValidWatchDate = (s: string | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}/.test(s) && !Number.isNaN(Date.parse(s));

const toUtc = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const key = (d: Date): string => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number): Date => new Date(d.getTime() + n * DAY_MS);

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  let level: ActivityLevel = 1;
  for (let i = 0; i < ACTIVITY_LEVEL_THRESHOLDS.length; i += 1) {
    if (count >= ACTIVITY_LEVEL_THRESHOLDS[i]) level = (i + 1) as ActivityLevel;
  }
  return level;
}

/**
 * Group any movie carrying a real `watch_date` (so `seen` unrated films count, but
 * empty-date watchlist entries do not) into a per-day count map.
 */
function bucketByDay(movies: Movie[]): Map<string, Movie[]> {
  const byDay = new Map<string, Movie[]>();
  for (const m of movies) {
    if (!isValidWatchDate(m.watch_date)) continue;
    const k = m.watch_date.slice(0, 10);
    const bucket = byDay.get(k);
    if (bucket) bucket.push(m);
    else byDay.set(k, [m]);
  }
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => b.point - a.point);
  }
  return byDay;
}

function computeStreaks(
  byDay: Map<string, Movie[]>,
  today: Date,
): { currentStreak: number; longestStreak: number } {
  // bucketByDay only ever creates non-empty buckets, so every key is an active day.
  const activeDays = [...byDay.keys()].sort();
  if (activeDays.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < activeDays.length; i += 1) {
    const prev = toUtc(activeDays[i - 1]).getTime();
    const cur = toUtc(activeDays[i]).getTime();
    if (cur - prev === DAY_MS) run += 1;
    else run = 1;
    if (run > longest) longest = run;
  }

  // Current streak counts back from today, or from yesterday when today has no film yet,
  // so an active daily habit is not reset to 0 just because today is not logged.
  const active = new Set(activeDays);
  let cursor = active.has(key(today)) ? today : addDays(today, -1);
  let current = 0;
  while (active.has(key(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { currentStreak: current, longestStreak: longest };
}

function computeMonthly(byDay: Map<string, Movie[]>, today: Date): MonthlyCount[] {
  const months: MonthlyCount[] = [];
  const totals = new Map<string, number>();
  for (const [k, bucket] of byDay) {
    const ym = k.slice(0, 7);
    totals.set(ym, (totals.get(ym) ?? 0) + bucket.length);
  }
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(y, m - i, 1));
    const ym = key(d).slice(0, 7);
    months.push({ key: ym, label: MONTH_LABELS[d.getUTCMonth()], count: totals.get(ym) ?? 0 });
  }
  return months;
}

export function computeActivity(movies: Movie[], now: Date = new Date()): ActivitySummary {
  const byDay = bucketByDay(movies);

  // Strip time-of-day and pin to UTC midnight so the grid is deterministic.
  const today = toUtc(key(now));
  const lastSunday = addDays(today, -today.getUTCDay());
  const firstSunday = addDays(lastSunday, -(ACTIVITY_WEEKS - 1) * 7);

  const weeks: (ActivityDay | null)[][] = [];
  const monthLabels: { index: number; label: string }[] = [];
  let total = 0;
  let activeDays = 0;
  let busiestDay: { date: string; count: number } | null = null;
  let lastMonth = -1;

  for (let w = 0; w < ACTIVITY_WEEKS; w += 1) {
    const column: (ActivityDay | null)[] = [];
    const columnStart = addDays(firstSunday, w * 7);
    const month = columnStart.getUTCMonth();
    if (month !== lastMonth) {
      const prev = monthLabels[monthLabels.length - 1];
      // A leading partial week can put two month labels one column apart, which overlap
      // in the SVG. If the previous label is too close, replace it so the later month
      // wins instead of both rendering on top of each other.
      if (!prev || w - prev.index >= MONTH_LABEL_MIN_GAP) {
        monthLabels.push({ index: w, label: MONTH_LABELS[month] });
      } else {
        monthLabels[monthLabels.length - 1] = { index: w, label: MONTH_LABELS[month] };
      }
      lastMonth = month;
    }
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(columnStart, d);
      // Days past today (the tail of the current week) render as blanks.
      if (date.getTime() > today.getTime()) {
        column.push(null);
        continue;
      }
      const k = key(date);
      const bucket = byDay.get(k) ?? [];
      const count = bucket.length;
      if (count > 0) {
        total += count;
        activeDays += 1;
        if (!busiestDay || count > busiestDay.count) busiestDay = { date: k, count };
      }
      column.push({ date: k, count, level: activityLevel(count), movies: bucket });
    }
    weeks.push(column);
  }

  const { currentStreak, longestStreak } = computeStreaks(byDay, today);

  return {
    weeks,
    monthLabels,
    total,
    activeDays,
    busiestDay,
    currentStreak,
    longestStreak,
    monthly: computeMonthly(byDay, today),
    rangeStart: key(firstSunday),
    rangeEnd: key(today),
  };
}
