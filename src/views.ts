import { Activity, Bookmark, ChartColumn, Check, Eye, Play } from 'lucide-react';
import type React from 'react';
import type { View } from './types';

/**
 * The top-level views, as data. Previously the same n-way branch was written three times in
 * App.tsx (once to pick the grid's source list, once for the header counters, once for the
 * tab strip), so adding a view meant finding all three. The tab strip and the source list
 * now read off this table; the counters read off a switch that the compiler checks for
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
  source: 'watched' | 'watching' | 'watchlist' | 'seen' | null;
  /**
   * Whether the tab shows a count. Stats has none because its figure would only repeat the
   * Watched tab's.
   */
  showCount: boolean;
}

export const VIEW_SPECS: ViewSpec[] = [
  { key: 'watched', label: 'Watched', icon: Eye, source: 'watched', showCount: true },
  { key: 'watching', label: 'In Progress', icon: Play, source: 'watching', showCount: true },
  { key: 'watchlist', label: 'Watchlist', icon: Bookmark, source: 'watchlist', showCount: true },
  { key: 'seen', label: 'Seen', icon: Check, source: 'seen', showCount: true },
  { key: 'history', label: 'History', icon: Activity, source: null, showCount: true },
  { key: 'stats', label: 'Stats', icon: ChartColumn, source: null, showCount: false },
];

export const DEFAULT_VIEW: View = 'watched';

// Keyed rather than searched, so viewSpec has no unreachable fallback branch: the index is
// typed Record<View, ViewSpec>, which also makes a missing VIEW_SPECS entry a type error.
const BY_KEY = Object.fromEntries(VIEW_SPECS.map(s => [s.key, s])) as Record<View, ViewSpec>;

// Membership is checked against a Set, not with `in` against BY_KEY: `in` walks the
// prototype chain, so `?view=toString` would pass and then fall through the exhaustive
// switch that builds the header counters, blanking the page. `view` comes straight off the
// query string, so this is reachable from a link.
const VIEW_KEYS = new Set<string>(VIEW_SPECS.map(s => s.key));

export const isView = (v: string): v is View => VIEW_KEYS.has(v);

/** Safe to index directly: callers pass a `View`, which only isView can produce. */
export const viewSpec = (v: View): ViewSpec => BY_KEY[v];
