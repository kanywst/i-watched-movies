import React, { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import moviesData from './data/movies.json';
import { Movie, SortKey, View } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { Film, Bookmark, Eye, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { CONFIG } from './config';
import { NEW_LIMIT, RANK_LIMIT, SORT_OPTIONS } from './constants';
import { sortMovies } from './sortMovies';
import { computeStats, computeWatchlistStats } from './stats';
import { useDocumentMetadata } from './useDocumentMetadata';
import { urlParams, useUrlState } from './useUrlState';

const VIEW_VALUES: View[] = ['watched', 'watchlist'];
const SORT_VALUES: SortKey[] = SORT_OPTIONS.map(o => o.value);

const URL_SPECS = {
  view: urlParams.string('watched'),
  search: urlParams.string(''),
  sort: urlParams.string('watch_date_desc'),
  tags: urlParams.stringList(),
  selected: urlParams.string(''),
};

const isView = (v: string): v is View => (VIEW_VALUES as string[]).includes(v);
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
  const view: View = isView(urlState.view) ? urlState.view : 'watched';
  const sort: SortKey = isSort(urlState.sort) ? urlState.sort : 'watch_date_desc';
  const search = urlState.search;
  const selectedTags = urlState.tags;

  const setSearch = (search: string) => setUrlState({ search });
  const setSort = (sort: SortKey) => setUrlState({ sort });

  useDocumentMetadata(
    `The Movies ${CONFIG.USER_NAME} Watched`,
    `https://github.com/${CONFIG.USER_NAME}.png`,
  );

  const allMovies = moviesData as Movie[];

  const watchedMovies = useMemo(() => allMovies.filter(m => m.published), [allMovies]);
  const watchlistMovies = useMemo(() => allMovies.filter(m => !m.published), [allMovies]);

  const selectedMovie: Movie | null = useMemo(
    () => allMovies.find(m => m.id === urlState.selected) ?? null,
    [allMovies, urlState.selected],
  );

  const stats = useMemo(() => computeStats(watchedMovies), [watchedMovies]);

  const watchlistStats = useMemo(() => computeWatchlistStats(watchlistMovies), [watchlistMovies]);

  const viewMovies = view === 'watched' ? watchedMovies : watchlistMovies;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    viewMovies.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [viewMovies]);

  const rankedMovieIds = useMemo(() => {
    return sortMovies(watchedMovies, 'point_desc')
      .slice(0, RANK_LIMIT)
      .map(m => m.id);
  }, [watchedMovies]);

  const newMovieIds = useMemo(() => {
    return new Set(
      sortMovies(watchedMovies, 'watch_date_desc')
        .slice(0, NEW_LIMIT)
        .map(m => m.id),
    );
  }, [watchedMovies]);

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

  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    // Side effects belong in the event handler, not the (pure) state updater.
    document.documentElement.classList.toggle('dark', next === 'dark');
    try { localStorage.setItem('theme', next); } catch { /* storage unavailable */ }
    setTheme(next);
  };

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

        {/* Stats */}
        {view === 'watched' ? (
          <div className="flex items-end gap-8">
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-5xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{stats.total}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Collected</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{stats.averagePoint.toFixed(1)}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Avg Score</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{stats.thisYearCount}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{stats.currentYear}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-8">
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-5xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{watchlistMovies.length}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">On Watchlist</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{watchlistStats.upcoming}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Upcoming</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-800 dark:text-stone-200 tabular-nums">{watchlistStats.genres}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Genres</div>
            </div>
          </div>
        )}
      </header>

      {/* View Toggle */}
      <div className="flex gap-1 mb-6 p-1 rounded-full w-fit bg-stone-100 border border-stone-200 dark:bg-white/5 dark:border-white/5">
        <ViewTab active={view === 'watched'} onClick={() => switchView('watched')} icon={Eye} label="Watched" count={watchedMovies.length} />
        <ViewTab active={view === 'watchlist'} onClick={() => switchView('watchlist')} icon={Bookmark} label="Watchlist" count={watchlistMovies.length} />
      </div>

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
            {view === 'watchlist' && watchlistMovies.length === 0
              ? 'No movies on your watchlist yet.'
              : 'No movies found matching your criteria.'}
          </p>
        </div>
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
  count: number;
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
    <span className={clsx('text-xs', active ? 'text-stone-300 dark:text-stone-500' : 'text-stone-400 dark:text-stone-600')}>{count}</span>
  </button>
);

export default App;
