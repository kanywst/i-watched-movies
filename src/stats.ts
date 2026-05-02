import type { Movie } from './types';

export interface MovieStats {
  total: number;
  averagePoint: number;
  thisYearCount: number;
  currentYear: number;
}

export function computeStats(movies: Movie[], now: Date = new Date()): MovieStats {
  const total = movies.length;
  const currentYear = now.getFullYear();
  const yearPrefix = String(currentYear);

  const { sum, thisYearCount } = movies.reduce(
    (acc, m) => {
      acc.sum += m.point;
      if (m.watch_date?.startsWith(yearPrefix)) acc.thisYearCount += 1;
      return acc;
    },
    { sum: 0, thisYearCount: 0 },
  );

  return {
    total,
    averagePoint: total > 0 ? sum / total : 0,
    thisYearCount,
    currentYear,
  };
}
