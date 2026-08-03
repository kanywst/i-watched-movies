import { Activity, Bookmark, ChartColumn, Check, Eye } from 'lucide-react';
import type React from 'react';
import type { View } from './types';

/**
 * The five top-level views, as data. Previously the same five-way branch was written three
 * times in App.tsx (once to pick the grid's source list, once for the header counters, once
 * for the tab strip), so adding a view meant finding all three. The tab strip and the source
 * list now read off this table; the counters read off a switch that the compiler checks for
 * exhaustiveness against `View`.
 */
export interface ViewSpec {
  key: View;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /**
   * Which movie list the filter bar and grid operate on. `null` for the views that render
   * their own panel instead (History, Stats), which is also what suppresses the filter bar.
   */
  source: 'watched' | 'watchlist' | 'seen' | null;
  /**
   * Whether the tab shows a count. Stats has none because its figure would only repeat the
   * Watched tab's.
   */
  showCount: boolean;
}

export const VIEW_SPECS: ViewSpec[] = [
  { key: 'watched', label: 'Watched', icon: Eye, source: 'watched', showCount: true },
  { key: 'watchlist', label: 'Watchlist', icon: Bookmark, source: 'watchlist', showCount: true },
  { key: 'seen', label: 'Seen', icon: Check, source: 'seen', showCount: true },
  { key: 'history', label: 'History', icon: Activity, source: null, showCount: true },
  { key: 'stats', label: 'Stats', icon: ChartColumn, source: null, showCount: false },
];

export const DEFAULT_VIEW: View = 'watched';

const VIEW_KEYS = new Set<string>(VIEW_SPECS.map(s => s.key));

export const isView = (v: string): v is View => VIEW_KEYS.has(v);

export const viewSpec = (v: View): ViewSpec =>
  VIEW_SPECS.find(s => s.key === v) ?? VIEW_SPECS[0];
