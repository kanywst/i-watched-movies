import React, { useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Movie, SortKey, View } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { TastePanel } from './components/TastePanel';
import { Stat, type StatProps } from './components/ui/Stat';
import { Film, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { CONFIG } from './config';
import { NEW_LIMIT, RANK_LIMIT, RECOMMENDATION_LIMIT, SORT_OPTIONS } from './constants';
import { sortMovies } from './sortMovies';
import { computeStats, computeWatchlistStats } from './stats';
import { computeActivity } from './activity';
import { computeScoringHabits, computeTasteProfile, recommendWatchlist } from './taste';
import {
  ALL_MOVIES,
  HISTORY_COUNT,
  HISTORY_MOVIES,
  SEEN_GENRE_COUNT,
  SEEN_MOVIES,
  TAB_COUNTS,
  WATCHED_MOVIES,
  WATCHLIST_MOVIES,
} from './collections';
import { useDocumentMetadata } from './useDocumentMetadata';
import { urlParams, useUrlState } from './useUrlState';
import { useTheme } from './useTheme';
import { DEFAULT_VIEW, VIEW_SPECS, isView, viewSpec } from './views';

// Stable empty reference so the History and Stats views don't bust the
// allTags/filteredMovies memos.
const EMPTY_MOVIES: Movie[] = [];
const SORT_VALUES: SortKey[] = SORT_OPTIONS.map(o => o.value);

const URL_SPECS = {
  view: urlParams.string('watched'),
  search: urlParams.string(''),
  sort: urlParams.string('watch_date_desc'),
  tags: urlParams.stringList(),
  selected: urlParams.string(''),
};

const isSort = (s: string): s is SortKey => (SORT_VALUES as string[]).includes(s);

const withViewTransition = (fn: () => void) => {
  if (typeof document !== 'undefined' && 'startViewTransition' in document) {
    (document as Document & { startViewTransition: (cb: () => void) => void })
      .startViewTransition(() => flushSync(fn));
  } else {
    fn();
  }
};

const App: React.FC = () => {
  const [urlState, setUrlState] = useUrlState(URL_SPECS);
  const view: View = isView(urlState.view) ? urlState.view : DEFAULT_VIEW;
  const sort: SortKey = isSort(urlState.sort) ? urlState.sort : 'watch_date_desc';
  const search = urlState.search;
  const selectedTags = urlState.tags;

  const setSearch = (search: string) => setUrlState({ search });
  const setSort = (sort: SortKey) => setUrlState({ sort });

  useDocumentMetadata(
    `The Movies ${CONFIG.USER_NAME} Watched`,
    `https://github.com/${CONFIG.USER_NAME}.png`,
  );

  const selectedMovie: Movie | null = useMemo(
    () => ALL_MOVIES.find(m => m.id === urlState.selected) ?? null,
    [urlState.selected],
  );

  const stats = useMemo(() => computeStats(WATCHED_MOVIES), []);
  const watchlistStats = useMemo(() => computeWatchlistStats(WATCHLIST_MOVIES), []);
  const activity = useMemo(() => computeActivity(HISTORY_MOVIES), []);

  // Taste analysis reads the rated films only: `seen` entries carry no score and watchlist
  // entries have not been watched, so neither can say anything about how kt rates things.
  const tasteProfile = useMemo(() => computeTasteProfile(WATCHED_MOVIES), []);
  const scoringHabits = useMemo(
    () => computeScoringHabits(WATCHED_MOVIES, tasteProfile),
    [tasteProfile],
  );
  const recommendations = useMemo(
    () => recommendWatchlist(WATCHLIST_MOVIES, WATCHED_MOVIES, tasteProfile, RECOMMENDATION_LIMIT),
    [tasteProfile],
  );

  const spec = viewSpec(view);
  // A `null` source is a view that renders its own panel rather than the grid.
  const viewMovies =
    spec.source === 'watched' ? WATCHED_MOVIES
      : spec.source === 'watchlist' ? WATCHLIST_MOVIES
        : spec.source === 'seen' ? SEEN_MOVIES
          : EMPTY_MOVIES;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    viewMovies.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [viewMovies]);

  const rankedMovieIds = useMemo(
    () => sortMovies(WATCHED_MOVIES, 'point_desc').slice(0, RANK_LIMIT).map(m => m.id),
    [],
  );

  const newMovieIds = useMemo(
    () => new Set(sortMovies(WATCHED_MOVIES, 'watch_date_desc').slice(0, NEW_LIMIT).map(m => m.id)),
    [],
  );

  // One row of counters per view. Data, not JSX, so adding a view means adding a case here
  // rather than another near-identical block of markup.
  const headerStats: StatProps[] = useMemo(() => {
    switch (view) {
      case 'watched':
        return [
          { value: stats.total, label: 'Collected', size: 'lg' },
          { value: stats.averagePoint.toFixed(1), label: 'Avg Score' },
          { value: stats.thisYearCount, label: String(stats.currentYear) },
        ];
      case 'seen':
        return [
          { value: SEEN_MOVIES.length, label: 'Seen', size: 'lg' },
          { value: SEEN_GENRE_COUNT, label: 'Genres' },
        ];
      case 'history':
        return [
          { value: HISTORY_COUNT, label: 'Logged', size: 'lg' },
          { value: activity.total, label: 'Last 12 Mo' },
        ];
      case 'stats':
        return [
          { value: tasteProfile.total, label: 'Rated', size: 'lg' },
          { value: tasteProfile.baseline.toFixed(1), label: 'Average' },
          { value: tasteProfile.genres.length, label: 'Genres' },
        ];
      case 'watchlist':
        return [
          { value: WATCHLIST_MOVIES.length, label: 'On Watchlist', size: 'lg' },
          { value: watchlistStats.upcoming, label: 'Upcoming' },
          { value: watchlistStats.genres, label: 'Genres' },
        ];
    }
  }, [view, stats, activity, tasteProfile, watchlistStats]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = viewMovies.filter((movie) => {
      const matchesSearch =
        q === '' ||
        movie.title.toLowerCase().includes(q) ||
        (movie.summary?.toLowerCase().includes(q) ?? false) ||
        (movie.national?.toLowerCase().includes(q) ?? false) ||
        movie.content.toLowerCase().includes(q) ||
        movie.tags.some(tag => tag.toLowerCase().includes(q));
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => movie.tags.includes(t));
      return matchesSearch && matchesTags;
    });
    return sortMovies(filtered, sort);
  }, [viewMovies, search, sort, selectedTags]);

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t: string) => t !== tag)
      : [...selectedTags, tag];
    setUrlState({ tags: next });
  };

  const getRank = (movieId: string) => {
    if (view !== 'watched') return undefined;
    const index = rankedMovieIds.indexOf(movieId);
    return index !== -1 ? index + 1 : undefined;
  };

  const switchView = (next: View) => {
    setUrlState({ view: next, tags: [] });
  };

  const openMovie = (movie: Movie) =>
    withViewTransition(() => setUrlState({ selected: movie.id }, { history: 'push' }));
  const closeMovie = () =>
    withViewTransition(() => setUrlState({ selected: '' }, { history: 'push' }));

  const [theme, toggleTheme] = useTheme();

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed top-4 right-4 z-30 p-2.5 rounded-full backdrop-blur-md transition-colors bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 dark:bg-white/5 dark:text-stone-300 dark:border-white/10 dark:hover:bg-white/10"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      {/* Header */}
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-stone-200 dark:border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 text-stone-700 dark:bg-white/5 dark:border-white/5 dark:text-stone-200">
              <Film className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium tracking-[0.2em] text-stone-500 dark:text-stone-400 uppercase">Personal Archives</span>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={`https://github.com/${CONFIG.USER_NAME}.png`}
              alt={CONFIG.USER_NAME}
              className="w-16 h-16 md:w-28 md:h-28 rounded-full border-2 border-stone-200 dark:border-white/10"
            />
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight text-stone-900 dark:text-stone-100">
              The Movies <br className="hidden md:block" />
              <span className="text-stone-900 dark:text-stone-100">{CONFIG.USER_NAME}</span>
              <span className="ml-3 text-stone-400 dark:text-stone-500">Watched</span>
            </h1>
          </div>
        </div>

        {/* Stats. The lead figure of each group is `lg`, its siblings `md`. */}
        <div className="flex items-end gap-8">
          {headerStats.map(s => (
            <Stat key={s.label} {...s} align="end" size={s.size ?? 'md'} />
          ))}
        </div>
      </header>

      {/* View Toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-full w-fit bg-stone-100 border border-stone-200 dark:bg-white/5 dark:border-white/5">
        {VIEW_SPECS.map(s => (
          <ViewTab
            key={s.key}
            active={view === s.key}
            onClick={() => switchView(s.key)}
            icon={s.icon}
            label={s.label}
            count={s.showCount ? TAB_COUNTS[s.key] : undefined}
          />
        ))}
      </div>

      {view === 'history' ? (
        <ActivityHeatmap summary={activity} onOpenMovie={openMovie} />
      ) : view === 'stats' ? (
        <TastePanel
          profile={tasteProfile}
          habits={scoringHabits}
          recommendations={recommendations}
          onOpenMovie={openMovie}
        />
      ) : (
        <>
          {/* Filters */}
          <FilterBar
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            selectedTags={selectedTags}
            toggleTag={toggleTag}
            clearTags={() => setUrlState({ tags: [] })}
            allTags={allTags}
          />

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-6 gap-y-10">
            {filteredMovies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                index={index}
                rank={getRank(movie.id)}
                isNew={view === 'watched' && newMovieIds.has(movie.id)}
                isSelected={movie.id === urlState.selected}
                onClick={openMovie}
              />
            ))}
          </div>

          {filteredMovies.length === 0 && (
            <div className="py-32 text-center text-stone-500">
              <p className="text-lg">
                {view === 'watchlist' && WATCHLIST_MOVIES.length === 0
                  ? 'No movies on your watchlist yet.'
                  : view === 'seen' && SEEN_MOVIES.length === 0
                    ? 'Nothing here yet. This is for films you have seen but do not rate.'
                    : 'No movies found matching your criteria.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-32 py-12 border-t flex justify-between items-center text-sm border-stone-200 text-stone-500 dark:border-white/5 dark:text-stone-500">
        <div className="flex items-center gap-2">
          <p>© {new Date().getFullYear()} The Movies {CONFIG.USER_NAME} Watched</p>
          <img
            src={`https://github.com/${CONFIG.USER_NAME}.png`}
            alt={CONFIG.USER_NAME}
            className="w-5 h-5 rounded-full border border-stone-200 dark:border-white/10"
          />
        </div>
        <p className="opacity-50">Minimalist Cinema Tracker</p>
      </footer>

      {/* Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        onClose={closeMovie}
      />
    </div>
  );
};

interface ViewTabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** Omitted where a count would only repeat another tab's, as on Stats. */
  count?: number;
}

const ViewTab: React.FC<ViewTabProps> = ({ active, onClick, icon: Icon, label, count }) => (
  <button
    onClick={onClick}
    className={clsx(
      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
      active
        ? 'bg-stone-900 text-stone-50 shadow-sm dark:bg-stone-100 dark:text-stone-900'
        : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200',
    )}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    {count !== undefined && (
      <span className={clsx('text-xs', active ? 'text-stone-300 dark:text-stone-500' : 'text-stone-400 dark:text-stone-600')}>{count}</span>
    )}
  </button>
);

export default App;
