import React, { useMemo, useState } from 'react';
import moviesData from './data/movies.json';
import { Movie, SortKey, View } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { Film, Bookmark, Eye } from 'lucide-react';
import { clsx } from 'clsx';
import { CONFIG } from './config';
import { NEW_LIMIT, RANK_LIMIT } from './constants';
import { sortMovies } from './sortMovies';
import { computeStats } from './stats';
import { useDocumentMetadata } from './useDocumentMetadata';

const App: React.FC = () => {
  const [view, setView] = useState<View>('watched');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('watch_date_desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useDocumentMetadata(
    `The Movies ${CONFIG.USER_NAME} Watched`,
    `https://github.com/${CONFIG.USER_NAME}.png`,
  );

  const allMovies = moviesData as Movie[];

  const watchedMovies = useMemo(() => allMovies.filter(m => m.published), [allMovies]);
  const watchlistMovies = useMemo(() => allMovies.filter(m => !m.published), [allMovies]);

  const stats = useMemo(() => computeStats(watchedMovies), [watchedMovies]);

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
    const filtered = viewMovies.filter((movie) => {
      const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => movie.tags.includes(t));
      return matchesSearch && matchesTags;
    });
    return sortMovies(filtered, sort);
  }, [viewMovies, search, sort, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getRank = (movieId: string) => {
    if (view !== 'watched') return undefined;
    const index = rankedMovieIds.indexOf(movieId);
    return index !== -1 ? index + 1 : undefined;
  };

  const switchView = (next: View) => {
    setView(next);
    setSelectedTags([]);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/5 text-stone-200">
              <Film className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium tracking-[0.2em] text-stone-400 uppercase">Personal Archives</span>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={`https://github.com/${CONFIG.USER_NAME}.png`}
              alt={CONFIG.USER_NAME}
              className="w-16 h-16 md:w-28 md:h-28 rounded-full border-2 border-white/10"
            />
            <h1 className="text-4xl md:text-6xl font-bold text-stone-100 tracking-tight leading-tight">
              The Movies <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 drop-shadow-sm">
                {CONFIG.USER_NAME}
              </span>
              <span className="ml-3 text-stone-500">Watched</span>
            </h1>
          </div>
        </div>

        {/* Stats */}
        {view === 'watched' ? (
          <div className="flex items-end gap-8">
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-5xl font-light text-stone-200">{filteredMovies.length}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Collected</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-200">{stats.averagePoint.toFixed(1)}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">Avg Score</div>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <div className="text-3xl font-light text-stone-200">{stats.thisYearCount}</div>
              <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{stats.currentYear}</div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start md:items-end gap-1">
            <div className="text-5xl font-light text-stone-200">{filteredMovies.length}</div>
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">On Watchlist</div>
          </div>
        )}
      </header>

      {/* View Toggle */}
      <div className="flex gap-1 mb-6 p-1 bg-white/5 border border-white/5 rounded-full w-fit">
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
            isNew={view === 'watched' && sort === 'watch_date_desc' && newMovieIds.has(movie.id)}
            onClick={setSelectedMovie}
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
      <footer className="mt-32 py-12 border-t border-white/5 flex justify-between items-center text-stone-500 text-sm">
        <div className="flex items-center gap-2">
          <p>© {new Date().getFullYear()} The Movies {CONFIG.USER_NAME} Watched</p>
          <img
            src={`https://github.com/${CONFIG.USER_NAME}.png`}
            alt={CONFIG.USER_NAME}
            className="w-5 h-5 rounded-full border border-white/10"
          />
        </div>
        <p className="opacity-50">Minimalist Cinema Tracker</p>
      </footer>

      {/* Detail Modal */}
      <MovieDetailModal
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
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
        ? 'bg-stone-100 text-stone-900 shadow-sm'
        : 'text-stone-400 hover:text-stone-200',
    )}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
    <span className={clsx('text-xs', active ? 'text-stone-500' : 'text-stone-600')}>{count}</span>
  </button>
);

export default App;
