import React, { useMemo, useState } from 'react';
import moviesData from './data/movies.json';
import { Movie, SortKey } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { Film } from 'lucide-react';
import { CONFIG } from './config';
import { NEW_LIMIT, RANK_LIMIT } from './constants';
import { sortMovies } from './sortMovies';
import { useDocumentMetadata } from './useDocumentMetadata';

const App: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('watch_date_desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  useDocumentMetadata(
    `The Movies ${CONFIG.USER_NAME} Watched`,
    `https://github.com/${CONFIG.USER_NAME}.png`,
  );

  const movies = moviesData as Movie[];

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    movies.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [movies]);

  const rankedMovieIds = useMemo(() => {
    return sortMovies(movies, 'point_desc')
      .slice(0, RANK_LIMIT)
      .map(m => m.id);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const filtered = movies.filter((movie) => {
      const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => movie.tags.includes(t));
      return matchesSearch && matchesTags;
    });
    return sortMovies(filtered, sort);
  }, [movies, search, sort, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getRank = (movieId: string) => {
    const index = rankedMovieIds.indexOf(movieId);
    return index !== -1 ? index + 1 : undefined;
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

        <div className="flex flex-col items-start md:items-end gap-2">
          <div className="text-5xl font-light text-stone-200">{filteredMovies.length}</div>
          <div className="text-sm font-medium text-stone-500 uppercase tracking-wider">Collected Titles</div>
        </div>
      </header>

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
            isNew={sort === 'watch_date_desc' && index < NEW_LIMIT}
            onClick={setSelectedMovie}
          />
        ))}
      </div>

      {filteredMovies.length === 0 && (
        <div className="py-32 text-center text-stone-500">
          <p className="text-lg">No movies found matching your criteria.</p>
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

export default App;
