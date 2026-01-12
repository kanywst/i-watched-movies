import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Image as ImageIcon, Trophy, Crown } from 'lucide-react';
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
    if (r === 1) return { color: 'text-yellow-100', bg: 'bg-yellow-600/80 backdrop-blur-md shadow-lg', icon: Crown };
    if (r === 2) return { color: 'text-slate-100', bg: 'bg-slate-500/80 backdrop-blur-md shadow-lg', icon: Trophy };
    if (r === 3) return { color: 'text-orange-100', bg: 'bg-orange-700/80 backdrop-blur-md shadow-lg', icon: Trophy };
    return null;
  };

  const rankStyle = rank ? getRankBadge(rank) : null;

  return (
    <motion.div
      layoutId={`movie-card-${movie.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onClick(movie)}
      className="group relative flex flex-col bg-transparent cursor-pointer"
    >
      {/* Rank Badge - Floating */}
      {rankStyle && (
        <div className={clsx(
          "absolute -top-3 -left-3 z-40 w-8 h-8 rounded-full flex items-center justify-center shadow-xl border border-white/10",
          rankStyle.bg
        )}>
          <rankStyle.icon className={clsx("w-4 h-4", rankStyle.color)} />
        </div>
      )}

      {/* Image Container */}
      <div className="aspect-[2/3] w-full overflow-hidden relative bg-dark-card rounded-lg shadow-sm border border-white/5 transition-all duration-500 group-hover:shadow-2xl group-hover:border-white/20">
        
        {/* Loading Skeleton */}
        <AnimatePresence>
          {!isLoaded && !isError && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-dark-card animate-pulse"
            >
              <ImageIcon className="w-8 h-8 text-stone-700" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {isError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-dark-card text-stone-500 p-4 text-center">
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
                className="w-full h-full object-cover blur-2xl scale-125 opacity-30 grayscale-[0.2]"
              />
            </div>

            {/* Main Image Layer */}
            <img
              src={movie.cover_image}
              alt={movie.title}
              onLoad={handleImageLoad}
              onError={() => setIsError(true)}
              className={clsx(
                "relative z-10 w-full h-full transition-all duration-700 ease-out",
                isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95",
                isPortrait 
                  ? "object-cover group-hover:scale-105" 
                  : "object-contain shadow-2xl scale-90 group-hover:scale-95"
              )}
              loading="lazy"
            />
          </>
        )}

        {/* Rating Overlay (Always Visible) */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-medium text-white shadow-lg border border-white/10 transition-transform duration-300 group-hover:scale-105">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{movie.point}</span>
        </div>
      </div>

      {/* Content - Minimalist below card */}
      <div className="pt-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-tight text-stone-200 group-hover:text-white transition-colors line-clamp-1">
          {movie.title}
        </h2>
        
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>{movie.watch_date ? format(new Date(movie.watch_date), 'yyyy') : 'N/A'}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-stone-500"></span>
                <div className="flex items-center gap-1 text-stone-400">
                    <Star className="h-3 w-3 fill-stone-600 text-stone-600" />
                    <span>{movie.point}</span>
                </div>
            </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {movie.tags.slice(0, 2).map((tag) => (
            <span 
              key={tag} 
              className="text-[10px] text-stone-500 uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
