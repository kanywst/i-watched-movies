import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Calendar, Image as ImageIcon, Trophy, Crown } from 'lucide-react';
import { Movie } from '../types';
import { format } from 'date-fns';
import { clsx } from 'clsx';

interface MovieCardProps {
  movie: Movie;
  index: number;
  rank?: number;
  onClick: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, index, rank, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIsPortrait(img.naturalHeight > img.naturalWidth);
    setIsLoaded(true);
  };

  const getRankBadge = (r: number) => {
    if (r === 1) return { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', icon: Crown };
    if (r === 2) return { color: 'text-gray-300', bg: 'bg-gray-300/10 border-gray-300/20', icon: Trophy };
    if (r === 3) return { color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/20', icon: Trophy };
    return null;
  };

  const rankStyle = rank ? getRankBadge(rank) : null;

  return (
    <motion.div
      layoutId={`movie-card-${movie.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => onClick(movie)}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-dark-card border border-white/5 hover:border-white/10 transition-colors duration-300 h-full cursor-pointer hover:shadow-2xl hover:shadow-purple-500/10"
    >
      {/* Rank Badge */}
      {rankStyle && (
        <div className={clsx(
          "absolute top-0 left-0 z-40 px-3 py-1.5 rounded-br-2xl border-r border-b backdrop-blur-md flex items-center gap-1.5 shadow-lg",
          rankStyle.bg
        )}>
          <rankStyle.icon className={clsx("w-3.5 h-3.5", rankStyle.color)} />
          <span className={clsx("text-xs font-bold", rankStyle.color)}>
            #{rank}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="aspect-[2/3] w-full overflow-hidden relative bg-dark-bg">
        
        {/* Loading Skeleton */}
        <AnimatePresence>
          {!isLoaded && !isError && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-white/5 animate-pulse"
            >
              <ImageIcon className="w-8 h-8 text-white/10" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {isError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dark-bg text-dark-muted p-4 text-center">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No Image</span>
          </div>
        ) : (
          <>
            {/* Background Blur Layer (Visible if landscape or transparent) */}
            <div 
              className="absolute inset-0 overflow-hidden"
              aria-hidden="true"
            >
              <img
                src={movie.cover_image}
                alt=""
                className="w-full h-full object-cover blur-xl scale-110 opacity-50 saturate-150"
              />
            </div>

            {/* Main Image Layer */}
            <img
              src={movie.cover_image}
              alt={movie.title}
              onLoad={handleImageLoad}
              onError={() => setIsError(true)}
              className={clsx(
                "relative z-10 w-full h-full transition-all duration-700 ease-in-out",
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                isPortrait 
                  ? "object-cover group-hover:scale-105" 
                  : "object-contain shadow-xl scale-90 group-hover:scale-95"
              )}
              loading="lazy"
            />
          </>
        )}

        {/* Overlay Gradient (Always on top to ensure text readability) */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-dark-card via-transparent to-transparent opacity-80" />
        
        {/* Rating Badge */}
        <div className="absolute z-30 top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-yellow-400 border border-white/10 shadow-lg">
          <Star className="h-3 w-3 fill-yellow-400" />
          <span>{movie.point}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-3 z-20 relative bg-dark-card">
        <h2 className="text-lg font-bold leading-tight text-white group-hover:text-purple-400 transition-colors line-clamp-2">
          {movie.title}
        </h2>
        
        <div className="flex flex-wrap gap-2">
          {movie.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag} 
              className="inline-flex items-center text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/5"
            >
              {tag}
            </span>
          ))}
          {movie.tags.length > 3 && (
            <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40">
              +{movie.tags.length - 3}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-dark-muted border-t border-white/5">
          <div className="flex items-center gap-1.5" title="Watch Date">
            <Calendar className="h-3.5 w-3.5" />
            <span>{movie.watch_date ? format(new Date(movie.watch_date), 'MMM d, yyyy') : 'N/A'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
