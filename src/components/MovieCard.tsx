import React, { useState } from 'react';
import { Star, Image as ImageIcon, Medal, Award, Crown, Sparkles } from 'lucide-react';
import { Movie } from '../types';
import { clsx } from 'clsx';
import { COUNTRY_FLAGS } from '../constants';
import { StreamingBadges } from './StreamingBadges';
import { tmdbResize, tmdbSrcSet } from '../tmdbImage';

// The grid is 2 / 3 / 4 / 5 columns inside a max-w-7xl container, so a card is about
// 45vw on a phone and settles at ~220px once the container stops growing. Handing the
// browser this plus a srcSet lets it pick w185 on a phone and w342 on a desktop instead
// of downloading the 2000x3000 original for every card.
const CARD_SIZES =
  '(min-width: 1280px) 220px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 45vw';

interface MovieCardProps {
  movie: Movie;
  /** Position feeding the entrance stagger, already clamped by the caller. */
  staggerIndex: number;
  rank?: number;
  isNew?: boolean;
  isSelected?: boolean;
  onClick: (movie: Movie) => void;
}

const MovieCardImpl: React.FC<MovieCardProps> = ({ movie, staggerIndex, rank, isNew, isSelected, onClick }) => {
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
  // getUTCFullYear rather than date-fns `format(d, 'yyyy')`: this runs once per card in the
  // grid, and `format` pulls the whole token parser and the en-US locale in for what is one
  // field read. UTC rather than local because parseMovie writes midnight-UTC ISO strings, so
  // reading them locally shows the previous year for an early-January date west of UTC.
  const watchYear = (() => {
    if (!movie.watch_date) return 'N/A';
    const d = new Date(movie.watch_date);
    return Number.isNaN(d.getTime()) ? 'N/A' : String(d.getUTCFullYear());
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
      style={{ '--card-index': staggerIndex } as React.CSSProperties}
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
            {/* Background Blur Layer (Visible if landscape or transparent). It is behind a
                blur-2xl at 30% opacity, so the smallest published width is indistinguishable
                from the original, and it must carry loading="lazy" of its own: without it
                this layer eagerly fetched the full-size poster for every card in the grid and
                the lazy attribute on the main image below bought nothing. */}
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <img
                src={tmdbResize(movie.cover_image, 'w154')}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover blur-2xl scale-125 opacity-30 grayscale-[0.2]"
              />
            </div>

            {/* Main Image Layer */}
            <img
              src={tmdbResize(movie.cover_image, 'w342')}
              srcSet={tmdbSrcSet(movie.cover_image, ['w185', 'w342', 'w500'])}
              sizes={CARD_SIZES}
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

        <StreamingBadges movie={movie} variant="card" />
      </div>
    </div>
  );
};

/**
 * Memoized because the grid renders up to ~185 of these and every keystroke in the search
 * box rebuilds the list. All five props are primitives or stable references (`movie` comes
 * off the module-constant partitions, `onClick` is a useCallback in App, and `staggerIndex`
 * is clamped before it is passed), so the default shallow compare is enough.
 */
export const MovieCard = React.memo(MovieCardImpl);
