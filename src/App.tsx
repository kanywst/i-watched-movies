import React, { useMemo, useState } from 'react';
import moviesData from './data/movies.json';
import { Movie } from './types';
import { MovieCard } from './components/MovieCard';
import { FilterBar } from './components/FilterBar';
import { MovieDetailModal } from './components/MovieDetailModal';
import { Film } from 'lucide-react';

// You might want to get this from a config or env
const USER_NAME = "kanywst";

const App: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('watch_date_desc');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Derived state
  const movies = moviesData as Movie[];
  
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    movies.forEach(m => m.tags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [movies]);

  // Calculate Ranks (based on points)
  const rankedMovieIds = useMemo(() => {
    return [...movies]
      .sort((a, b) => Number(b.point) - Number(a.point))
      .slice(0, 3)
      .map(m => m.id);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies
      .filter((movie) => {
        const matchesSearch = movie.title.toLowerCase().includes(search.toLowerCase());
        const matchesTags = selectedTags.length === 0 || selectedTags.every(t => movie.tags.includes(t));
        return matchesSearch && matchesTags;
      })
      .sort((a, b) => {
        switch (sort) {
          case 'watch_date_desc':
            return new Date(b.watch_date).getTime() - new Date(a.watch_date).getTime();
          case 'watch_date_asc':
            return new Date(a.watch_date).getTime() - new Date(b.watch_date).getTime();
          case 'release_date_desc':
            return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
          case 'release_date_asc':
            return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
          case 'point_desc':
            return Number(b.point) - Number(a.point);
          case 'point_asc':
            return Number(a.point) - Number(b.point);
          default:
            return 0;
        }
      });
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
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Film className="h-6 w-6 text-purple-400" />
            </div>
            <span className="text-sm font-semibold tracking-wider text-purple-400 uppercase">Movie Log</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            The Movies <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{USER_NAME}</span> Watched
          </h1>
        </div>
        
        <div className="text-dark-muted text-sm font-medium">
          {filteredMovies.length} {filteredMovies.length === 1 ? 'Movie' : 'Movies'} Collected
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {filteredMovies.map((movie, index) => (
          <MovieCard 
            key={movie.id} 
            movie={movie} 
            index={index} 
            rank={getRank(movie.id)}
            onClick={setSelectedMovie}
          />
        ))}
      </div>

      {filteredMovies.length === 0 && (
        <div className="py-20 text-center text-dark-muted">
          <p>No movies found matching your criteria.</p>
        </div>
      )}
      
      {/* Footer */}
      <footer className="mt-20 pt-8 border-t border-white/5 text-center text-dark-muted text-sm">
        <p>© {new Date().getFullYear()} Movie Log. Built with React & Tailwind.</p>
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
