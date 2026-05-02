import type { Movie } from './types';

export interface MovieStats {
  total: number;
  averagePoint: number;
  thisYearCount: number;
  currentYear: number;
}

export function computeStats(movies: Movie[], now: Date = new Date()): MovieStats {
  const total = movies.length;
  const sum = movies.reduce((acc, m) => acc + m.point, 0);
  const averagePoint = total > 0 ? sum / total : 0;
  const currentYear = now.getFullYear();
  const thisYearCount = movies.filter(m => {
    if (!m.watch_date) return false;
    const d = new Date(m.watch_date);
    return Number.isFinite(d.getTime()) && d.getFullYear() === currentYear;
  }).length;
  return { total, averagePoint, thisYearCount, currentYear };
}
