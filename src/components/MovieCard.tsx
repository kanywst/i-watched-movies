import React, { useState } from 'react';
import { Star, Image as ImageIcon, Medal, Award, Crown, Sparkles } from 'lucide-react';
import { Movie } from '../types';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { COUNTRY_FLAGS } from '../constants';

interface MovieCardProps {
  movie: Movie;
  index: number;
  rank?: number;
  isNew?: boolean;
  isSelected?: boolean;
  onClick: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, index, rank, isNew, isSelected, onClick }) => {
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
    if (r === 2) return { color: 'text-slate-100', bg: 'bg-slate-500/80 backdrop-blur-md shadow-lg', icon: Medal };
    if (r === 3) return { color: 'text-orange-100', bg: 'bg-orange-700/80 backdrop-blur-md shadow-lg', icon: Award };
    return null;
  };

  const rankStyle = rank ? getRankBadge(rank) : null;
  const displayFlag = movie.national ? COUNTRY_FLAGS[movie.national] : null;
  const watchYear = (() => {
    if (!movie.watch_date) return 'N/A';
    const d = new Date(movie.watch_date);
    return Number.isNaN(d.getTime()) ? 'N/A' : format(d, 'yyyy');
  })();
  // When this card's modal is open, the modal owns the shared poster name.
  // Keeping it here too would make two live elements share one
  // view-transition-name, which aborts the transition.
  const posterStyle: React.CSSProperties = isSelected
    ? {}
    : { viewTransitionName: `poster-${movie.id}` };

  return (
    <div
      onClick={() => onClick(movie)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(movie);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${movie.title}${movie.published ? `, rated ${movie.point} out of 10` : ''}`}
      className="card-enter group relative flex flex-col bg-transparent cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-300 dark:focus-visible:ring-offset-stone-950"
      style={{ '--card-index': index } as React.CSSProperties}
    >
      {/* Rank Badge - Floating */}
      {rankStyle && (
        <div className={clsx(
          'absolute -top-3 -left-3 z-40 w-8 h-8 rounded-full flex items-center justify-center shadow-xl border border-white/10',
          rankStyle.bg,
        )}>
          <rankStyle.icon className={clsx('w-4 h-4', rankStyle.color)} />
        </div>
      )}

      {/* NEW Badge - Floating Top Right */}
      {isNew && (
        <div className="absolute -top-3 -right-3 z-40 px-2 py-1 bg-rose-500/90 backdrop-blur-md shadow-lg border border-white/10 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-white" />
          <span className="text-[10px] font-bold text-white tracking-wider">NEW</span>
        </div>
      )}

      {/* Image Container */}
      <div
        style={posterStyle}
        className="aspect-[2/3] w-full overflow-hidden relative rounded-lg shadow-sm transition-all duration-500 group-hover:shadow-2xl bg-stone-100 border border-stone-200 group-hover:border-stone-300 dark:bg-dark-card dark:border-white/5 dark:group-hover:border-white/20"
      >
        {/* Loading Skeleton */}
        {!isLoaded && !isError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center animate-pulse bg-stone-100 dark:bg-dark-card">
            <ImageIcon className="w-8 h-8 text-stone-400 dark:text-stone-700" />
          </div>
        )}

        {isError ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-stone-500 p-4 text-center bg-stone-100 dark:bg-dark-card">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">No Image</span>
          </div>
        ) : (
          <>
            {/* Background Blur Layer (Visible if landscape or transparent) */}
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
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
                'relative z-10 w-full h-full transition-all duration-700 ease-out',
                isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                isPortrait
                  ? 'object-cover group-hover:scale-105'
                  : 'object-contain shadow-2xl scale-90 group-hover:scale-95',
              )}
              loading="lazy"
            />
          </>
        )}

        {/* Rating Overlay (Always Visible) */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-medium text-white shadow-lg border border-white/10 transition-transform duration-300 group-hover:scale-105 tabular-nums">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span>{movie.point}</span>
        </div>
      </div>

      {/* Content - Minimalist below card */}
      <div className="pt-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold leading-tight transition-colors line-clamp-1 text-stone-800 group-hover:text-stone-950 dark:text-stone-200 dark:group-hover:text-white">
          {movie.title}
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="tabular-nums">{watchYear}</span>

            {displayFlag && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-stone-500"></span>
                <span className="text-sm filter grayscale-[0.3] hover:grayscale-0 transition-all" title={movie.national}>{displayFlag}</span>
              </>
            )}

            <span className="w-0.5 h-0.5 rounded-full bg-stone-500"></span>
            <div className="flex items-center gap-1 text-stone-400 tabular-nums">
              <Star className="h-3 w-3 fill-stone-400 text-stone-400 dark:fill-stone-600 dark:text-stone-600" />
              <span>{movie.point}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          {movie.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[10px] text-stone-500 uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
