import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Movie, SortKey, View } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { CONFIG, PROFILE_URL, avatarUrl } from './config';
import {
  MASTHEAD_POSTER_COUNT,
  MAX_STAGGER_INDEX,
  NEW_LIMIT,
  RANK_LIMIT,
  SORT_OPTIONS,
} from './constants';
import { tmdbResize } from './tmdbImage';
import { sortMovies } from './sortMovies';
import { computeStats, computeWatchlistStats } from './stats';
import { computeActivity } from './activity';
import {
  ALL_MOVIES,
  HISTORY_MOVIES,
  SEEN_GENRE_COUNT,
  SEEN_MOVIES,
  TAB_COUNTS,
  WATCHED_GENRE_COUNT,
  WATCHED_MOVIES,
  WATCHING_GENRE_COUNT,
  WATCHING_MOVIES,
  WATCHLIST_MOVIES,
} from './collections';

// The History and Stats panels are the two views the grid never needs, and between them
// they carry the heatmap, the whole of taste.ts and date-fns. Splitting them out keeps the
// entry chunk to what the default view actually renders; both are named exports, hence the
// unwrapping .then.
const ActivityHeatmap = lazy(() =>
  import('./components/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })),
);
const TastePanel = lazy(() =>
  import('./components/TastePanel').then(m => ({ default: m.TastePanel })),
);
import { useDocumentMetadata } from './useDocumentMetadata';
import { urlParams, useUrlState } from './useUrlState';
import { useTheme } from './useTheme';
import { DEFAULT_VIEW, VIEW_SPECS, isView, viewSpec } from './views';

// Stable empty reference so the History and Stats views don't bust the
// allTags/filteredMovies memos.
const EMPTY_MOVIES: Movie[] = [];
const SORT_VALUES: SortKey[] = SORT_OPTIONS.map(o => o.value);

/** A figure and its unit in the masthead. Rendered inline, so no size or alignment. */
interface HeaderStat {
  value: React.ReactNode;
  label: string;
}

const URL_SPECS = {
  view: urlParams.string('watched'),
  search: urlParams.string(''),
  sort: urlParams.string('watch_date_desc'),
  tags: urlParams.stringList(),
  selected: urlParams.string(''),
};

const isSort = (s: string): s is SortKey => (SORT_VALUES as string[]).includes(s);

interface ViewTransition {
  finished: Promise<void>;
}
type DocumentWithVT = Document & { startViewTransition: (cb: () => void) => ViewTransition };

/**
 * Runs `fn` inside a View Transition, or plainly where the API is missing. flushSync is
 * required so React commits the DOM update inside the transition callback, which is what
 * the browser snapshots as the new state.
 */
const withViewTransition = (fn: () => void): ViewTransition | null => {
  if (typeof document === 'undefined' || !('startViewTransition' in document)) {
    fn();
    return null;
  }
  return (document as DocumentWithVT).startViewTransition(() => flushSync(fn));
};

/**
 * Drop the view-transition-name once the animation is over, or immediately where there was
 * no transition to wait on. `finished` rejects when a transition is skipped (a second one
 * starting on top of it, say), which is not an error here, so both paths just clear.
 */
const clearAfter = (transition: ViewTransition | null, clear: (id: string) => void) => {
  if (!transition) {
    clear('');
    return;
  }
  transition.finished.then(() => clear(''), () => clear(''));
};

const App: React.FC = () => {
  const [urlState, setUrlState] = useUrlState(URL_SPECS);
  // Which card, if any, currently owns the shared poster view-transition-name.
  const [transitioningId, setTransitioningId] = React.useState('');
  const view: View = isView(urlState.view) ? urlState.view : DEFAULT_VIEW;
  const sort: SortKey = isSort(urlState.sort) ? urlState.sort : 'watch_date_desc';
  const search = urlState.search;
  const selectedTags = urlState.tags;

  const setSearch = (search: string) => setUrlState({ search });
  const setSort = (sort: SortKey) => setUrlState({ sort });

  useDocumentMetadata(
    `The Movies ${CONFIG.USER_NAME} Watched`,
    avatarUrl(460),
  );

  const selectedMovie: Movie | null = useMemo(
    () => ALL_MOVIES.find(m => m.id === urlState.selected) ?? null,
    [urlState.selected],
  );

  // Masthead backdrop. Read off the full watched list, not the current view, so filtering
  // or switching tabs does not reshuffle the header behind you.
  const bandPosters = useMemo(
    () =>
      WATCHED_MOVIES.filter(m => m.cover_image)
        .sort((a, b) => b.point - a.point)
        .slice(0, MASTHEAD_POSTER_COUNT),
    [],
  );

  const stats = useMemo(() => computeStats(WATCHED_MOVIES), []);
  const watchlistStats = useMemo(() => computeWatchlistStats(WATCHLIST_MOVIES), []);
  const activity = useMemo(() => computeActivity(HISTORY_MOVIES), []);

  const spec = viewSpec(view);
  // A `null` source is a view that renders its own panel rather than the grid.
  const viewMovies =
    spec.source === 'watched' ? WATCHED_MOVIES
      : spec.source === 'watching' ? WATCHING_MOVIES
        : spec.source === 'watchlist' ? WATCHLIST_MOVIES
          : spec.source === 'seen' ? SEEN_MOVIES
            : EMPTY_MOVIES;

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    viewMovies.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [viewMovies]);

  // Rank and NEW badges are computed over the full watched list, not the filtered/sorted
  // index, so they keep tracking the same films when filters change. A Map rather than an
  // array because getRank runs per rendered card; indexOf made that O(cards x RANK_LIMIT).
  const movieRanks = useMemo(
    () =>
      new Map(
        sortMovies(WATCHED_MOVIES, 'point_desc')
          .slice(0, RANK_LIMIT)
          .map((m, i) => [m.id, i + 1] as const),
      ),
    [],
  );

  const newMovieIds = useMemo(
    () => new Set(sortMovies(WATCHED_MOVIES, 'watch_date_desc').slice(0, NEW_LIMIT).map(m => m.id)),
    [],
  );

  // One row of counters per view. Data, not JSX, so adding a view means adding a case here
  // rather than another near-identical block of markup.
  //
  // The list's own size is deliberately absent from every case except Stats: the tab strip
  // sits directly below the header and already carries it as a badge, so a lead figure here
  // was printing the same number twice within a couple of centimetres. Stats is the one tab
  // with no badge (its figure would only repeat Watched's), so it states the count itself.
  const headerStats: HeaderStat[] = useMemo(() => {
    switch (view) {
      case 'watched':
        return [
          { value: stats.averagePoint.toFixed(1), label: 'avg score' },
          { value: stats.thisYearCount, label: `in ${stats.currentYear}` },
        ];
      case 'watching':
        return [{ value: WATCHING_GENRE_COUNT, label: 'genres' }];
      case 'seen':
        return [{ value: SEEN_GENRE_COUNT, label: 'genres' }];
      case 'history':
        return [{ value: activity.total, label: 'in the last year' }];
      // Deliberately read off `stats` rather than the taste profile: the profile's `total`
      // and `baseline` are the same count and mean over the same list, and its `genres` has
      // one entry per distinct tag, so the header needs none of taste.ts and the module can
      // stay behind the lazy TastePanel boundary.
      case 'stats':
        return [
          { value: stats.total, label: 'rated' },
          { value: stats.averagePoint.toFixed(1), label: 'average' },
          { value: WATCHED_GENRE_COUNT, label: 'genres' },
        ];
      case 'watchlist':
        return [
          { value: watchlistStats.upcoming, label: 'upcoming' },
          { value: watchlistStats.genres, label: 'genres' },
        ];
    }
  }, [view, stats, activity, watchlistStats]);

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

  const clearFilters = useCallback(
    () => setUrlState({ search: '', tags: [] }),
    [setUrlState],
  );

  const toggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t: string) => t !== tag)
      : [...selectedTags, tag];
    setUrlState({ tags: next });
  };

  const getRank = (movieId: string) =>
    view === 'watched' ? movieRanks.get(movieId) : undefined;

  const switchView = (next: View) => {
    setUrlState({ view: next, tags: [] });
  };

  // Stable identities: MovieCard is memoized, and a fresh onClick closure on every render
  // would defeat that for every card on each keystroke in the search box. `setUrlState`
  // is itself stable (useCallback with no deps in useUrlState).
  //
  // Only the card being handed to or from the modal carries a view-transition-name, and
  // `transitioningId` is what says which one. Naming every card meant the browser captured
  // a snapshot pair for all of them on every open, when exactly one element morphs.
  const openMovie = useCallback(
    (movie: Movie) => {
      // The old state is snapshotted the moment startViewTransition is called, so the card
      // has to be wearing the name already: commit that first, synchronously.
      flushSync(() => setTransitioningId(movie.id));
      const transition = withViewTransition(() =>
        setUrlState({ selected: movie.id }, { history: 'push' }),
      );
      clearAfter(transition, setTransitioningId);
    },
    [setUrlState],
  );

  // Closing runs the other way: the modal already holds the name in the old state, and the
  // card takes it back in the new one. Both happen in the same commit, so the name is never
  // on two live elements at once, which is what aborts a transition.
  const closeMovie = useCallback(() => {
    const closingId = urlState.selected;
    const transition = withViewTransition(() => {
      setTransitioningId(closingId);
      setUrlState({ selected: '' }, { history: 'push' });
    });
    clearAfter(transition, setTransitioningId);
  }, [setUrlState, urlState.selected]);

  const [theme, toggleTheme] = useTheme();

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      {/* Header. One band, not a masthead block: a past version (eyebrow label, 112px
          avatar, 60px two-line heading, 48px counter row) pushed the first poster 633px
          down a 600px viewport, so the page opened on chrome and no films. */}
      <header className="relative mb-6 overflow-hidden rounded-xl">
        {bandPosters.length > 0 && (
          <div aria-hidden className="absolute inset-0 flex">
            {bandPosters.map(m => (
              <img
                key={m.id}
                src={tmdbResize(m.cover_image, 'w185')}
                alt=""
                loading="lazy"
                decoding="async"
                /* Focus above centre: a poster's title block sits in its lower third, and
                   a centred crop would tile eight competing wordmarks behind ours. */
                className="min-w-0 flex-1 h-full object-cover object-[center_30%]"
              />
            ))}
          </div>
        )}
        <div aria-hidden className="masthead-scrim absolute inset-0" />

        {/* Not `justify-between`: at 1280px that leaves a void down the middle. The
            counters follow the title; only the theme switch is pushed out, via `ml-auto`. */}
        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-4 sm:px-5">
          {/* White hairline, not an accent: the avatar is an illustration on a near-white
              ground and needs an edge against the artwork behind it. */}
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.9)] transition-opacity hover:opacity-85"
          >
            {/* width/height reserve the space before the picture lands. GitHub's `?size=`
                is the square edge, so 92 is the 2x asset. */}
            <img
              src={avatarUrl(46)}
              srcSet={`${avatarUrl(46)} 1x, ${avatarUrl(92)} 2x`}
              width={46}
              height={46}
              alt={`${CONFIG.USER_NAME} on GitHub`}
              className="block h-[46px] w-[46px] rounded-full"
            />
          </a>
          {/* The one coloured word on the page. */}
          <h1 className="font-wordmark font-extrabold leading-[1.15] sm:leading-none tracking-[-0.025em] text-[19px] sm:text-[26px] md:text-[30px] text-stone-50">
            The Movies{' '}
            <span style={{ color: 'var(--accent-a)' }}>{CONFIG.USER_NAME}</span> Watched
          </h1>

          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 sm:gap-x-6">
            {headerStats.map(s => (
              <div key={s.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
                <dd className="text-[15px] font-semibold tabular-nums text-stone-50">
                  {s.value}
                </dd>
                <dt className="text-xs text-stone-300">{s.label}</dt>
              </div>
            ))}
          </dl>

          {/* In the header rather than floating over the page. Fixed at top-right it
              overlapped this very row, and a theme switch is a thing you reach for once. */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="ml-auto p-2 rounded-full transition-colors text-stone-300 hover:bg-white/10 hover:text-stone-50"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* View Toggle */}
      {/* Wraps rather than overflowing: six tabs are wider than a phone viewport, and a
          horizontal overflow here scrolls the whole page. */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-3xl md:rounded-full w-fit max-w-full bg-stone-100 border border-stone-200 dark:bg-white/5 dark:border-white/5">
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
        <Suspense fallback={<PanelFallback />}>
          <ActivityHeatmap summary={activity} onOpenMovie={openMovie} />
        </Suspense>
      ) : view === 'stats' ? (
        <Suspense fallback={<PanelFallback />}>
          <TastePanel
            watched={WATCHED_MOVIES}
            watchlist={WATCHLIST_MOVIES}
            onOpenMovie={openMovie}
          />
        </Suspense>
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
                // Clamped here rather than inside the card so the prop itself is stable:
                // past the first dozen cards every card gets the same value, so filtering
                // the grid does not invalidate the memo for the long tail just because the
                // positions shifted.
                staggerIndex={Math.min(index, MAX_STAGGER_INDEX)}
                rank={getRank(movie.id)}
                isNew={view === 'watched' && newMovieIds.has(movie.id)}
                isSelected={movie.id === urlState.selected}
                hasTransitionName={movie.id === transitioningId}
                onClick={openMovie}
              />
            ))}
          </div>

          {filteredMovies.length === 0 && (
            <EmptyGrid
              view={view}
              search={search}
              tagCount={selectedTags.length}
              total={viewMovies.length}
              onClearFilters={clearFilters}
            />
          )}
        </>
      )}

      {/* Footer */}
      {/* "Minimalist Cinema Tracker" used to sit on the right. It described the software
          rather than the diary, to a reader who is already looking at it, and the 20px
          avatar beside the copyright was the same illegible thumbnail the masthead dropped.
          What is actually useful here is the feed. */}
      <footer className="mt-24 py-10 border-t flex flex-wrap justify-between items-center gap-3 text-sm border-stone-200 text-stone-500 dark:border-white/5 dark:text-stone-500">
        <p>© {new Date().getFullYear()} The Movies {CONFIG.USER_NAME} Watched</p>
        <a
          href="./feed.xml"
          className="transition-colors hover:text-stone-800 dark:hover:text-stone-300"
        >
          RSS
        </a>
      </footer>

      {/* Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        onClose={closeMovie}
      />
    </div>
  );
};

/**
 * Placeholder while a lazily-loaded panel arrives. Sized to roughly the height of the panel
 * it stands in for, so switching to History or Stats does not collapse the page and bounce
 * the footer up before the chunk lands.
 */
const PanelFallback: React.FC = () => (
  <div className="py-32 text-center text-stone-400 dark:text-stone-600" aria-busy="true">
    <p className="text-sm">Loading…</p>
  </div>
);

/**
 * What the grid says when it has nothing to draw.
 *
 * Two different situations were sharing one line of copy. A filter that matched nothing is
 * recoverable and the reader is the one holding the filter, so it says what was searched,
 * how much is behind it, and offers the way back in a button. A section that is genuinely
 * empty is not a failure at all, so it explains what the section is for instead of
 * reporting an absence. The old wording, "No movies found matching your criteria", did
 * neither: it described the reader's search in the software's vocabulary and left them on a
 * dead end.
 */
interface EmptyGridProps {
  view: View;
  search: string;
  tagCount: number;
  /** Size of the unfiltered list for this view, which is what "show all" would restore. */
  total: number;
  onClearFilters: () => void;
}

const EMPTY_SECTION: Partial<Record<View, string>> = {
  watchlist: 'Nothing queued to watch.',
  watching: 'Nothing in progress. Series being watched right now live here.',
  seen: 'Nothing here. This is for films watched but left unrated.',
  watched: 'Nothing rated yet.',
};

const EmptyGrid: React.FC<EmptyGridProps> = ({ view, search, tagCount, total, onClearFilters }) => {
  // `total > 0` is load-bearing, not belt-and-braces. switchView clears the tags but keeps
  // the search term, so a search can be carried onto a tab whose unfiltered list is empty
  // (In Progress, the moment the last series is finished). Without this the filtered branch
  // wins and offers "Show all 0", which is both nonsense and a lie: clearing the filter
  // would show nothing either. With nothing behind the filter, the section's own message is
  // the honest one.
  const filtered = total > 0 && (search.trim() !== '' || tagCount > 0);

  if (!filtered) {
    return (
      <div className="py-28 text-center text-stone-500 dark:text-stone-400">
        <p className="text-base">{EMPTY_SECTION[view] ?? 'Nothing here.'}</p>
      </div>
    );
  }

  return (
    <div className="py-28 flex flex-col items-center gap-4 text-center">
      <p className="text-base text-stone-500 dark:text-stone-400">
        {search.trim() !== ''
          ? <>No match for &ldquo;<span className="text-stone-800 dark:text-stone-200">{search.trim()}</span>&rdquo;{tagCount > 0 && ' in the selected genres'}.</>
          : 'No film carries every selected genre.'}
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="text-sm px-4 py-2 rounded-full transition-colors bg-stone-900 text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
      >
        Show all {total}
      </button>
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
