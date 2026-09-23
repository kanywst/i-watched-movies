import React, { useState } from 'react';
import { Image as ImageIcon, Medal, Award, Crown, Sparkles } from 'lucide-react';
import { Movie } from '../types';
import { clsx } from 'clsx';
import { COUNTRY_FLAGS } from '../constants';
import { StreamingBadges } from './StreamingBadges';
import { isWatched } from '../partition';
import { RATED_POINTS } from '../collections';
import { bandOf, type ScoreBand } from '../scoreBand';
import { cardSeasonScore } from '../seasons';
import { tmdbResize, tmdbSrcSet } from '../tmdbImage';

// The grid is 2 / 3 / 4 / 5 columns inside a max-w-7xl container, so a card is about
// 45vw on a phone and settles at ~220px once the container stops growing. Handing the
// browser this plus a srcSet lets it pick w185 on a phone and w342 on a desktop instead
// of downloading the 2000x3000 original for every card.
const CARD_SIZES =
  '(min-width: 1280px) 220px, (min-width: 1024px) 23vw, (min-width: 768px) 30vw, 45vw';

/**
 * The score chip, by where the score stands in the diary (src/scoreBand.ts). One ramp of
 * presence, not a traffic light: the chip gains weight and steps from dark glass to a white
 * fill to the accent as the score climbs, so a grid reads as a spread at a glance without a
 * second colour system competing with the accent and the heatmap's greens.
 *
 * Nothing here is dimmed to the point of costing legibility. Standing low on this scale is
 * a real thing to show, but a chip printed over arbitrary artwork has to survive the poster
 * under it, so the low band recedes by giving up size and weight rather than contrast: it
 * keeps the same black/65 fill as mid, whose worst case is a pure-white poster behind it
 * (5.6:1 for stone-200, 7.0:1 for white, against a 4.5:1 floor at these sizes). A lighter
 * fill read as more recessive and was the wrong trade, since black/55 drops to 3.8:1 there.
 * The guarantee has to hold for any poster, not for the ones in the diary today.
 */
const SCORE_CHIP: Record<ScoreBand, { className: string; style?: React.CSSProperties }> = {
  low: {
    className: 'px-1.5 text-[11px] font-normal bg-black/65 text-stone-200 border-white/5',
  },
  mid: {
    className: 'px-2 text-sm font-medium bg-black/65 text-white border-white/10',
  },
  high: {
    className: 'px-2 text-sm font-semibold bg-white/95 text-stone-900 border-black/10',
  },
  top: {
    className: 'px-2 text-[15px] font-bold text-white border-white/25',
    style: { backgroundColor: 'var(--accent-a-solid)' },
  },
};

interface MovieCardProps {
  movie: Movie;
  /** Position feeding the entrance stagger, already clamped by the caller. */
  staggerIndex: number;
  rank?: number;
  isNew?: boolean;
  isSelected?: boolean;
  /**
   * True only for the card currently being handed to or from the modal. The poster's
   * view-transition-name is set from this rather than unconditionally, so the browser
   * snapshots one element pair per transition instead of one for every card in the grid.
   */
  hasTransitionName?: boolean;
  onClick: (movie: Movie) => void;
}

/**
 * One icon per metal; the fill and ink come from `.medal-N` in index.css. There are three
 * metals, which is a fact about medals rather than about RANK_LIMIT: if the limit is ever
 * raised, places past third fall back to the plain numeral chip below instead of losing
 * their badge.
 */
const RANK_ICON: Partial<Record<number, typeof Crown>> = { 1: Crown, 2: Medal, 3: Award };

const MovieCardImpl: React.FC<MovieCardProps> = ({ movie, staggerIndex, rank, isNew, isSelected, hasTransitionName, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setIsPortrait(img.naturalHeight > img.naturalWidth);
    setIsLoaded(true);
  };

  const displayFlag = movie.national ? COUNTRY_FLAGS[movie.national] : null;
  // Only a rated entry has a score worth printing. isWatched is the same rule the grid was
  // partitioned with, so a card can never disagree with the tab it is sitting under.
  const hasScore = isWatched(movie);
  const chip = hasScore ? SCORE_CHIP[bandOf(RATED_POINTS, movie.point)] : null;
  // The fallback for a series watched partway, which has no entry score at all. Only one
  // season reaches the card; see src/seasons.ts for which and why.
  const seasonChip = cardSeasonScore(movie, hasScore);
  // The year the film was watched, falling back to the year it came out. Watchlist and
  // in-progress entries have no watch_date, and printing "N/A" under a poster tells the
  // reader nothing; the release year is the fact that is actually known about them.
  const year = (() => {
    for (const iso of [movie.watch_date, movie.release_date]) {
      if (!iso) continue;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return String(d.getUTCFullYear());
    }
    return null;
  })();
  // getUTCFullYear rather than date-fns `format(d, 'yyyy')`: this runs once per card in the
  // grid, and `format` pulls the whole token parser and the en-US locale in for one field
  // read. UTC rather than local because parseMovie writes midnight-UTC ISO strings, so
  // reading them locally shows the previous year for an early-January date west of UTC.
  // When this card's modal is open, the modal owns the shared poster name. Keeping it here
  // too would make two live elements share one view-transition-name, which aborts the
  // transition.
  const posterStyle: React.CSSProperties =
    hasTransitionName && !isSelected ? { viewTransitionName: `poster-${movie.id}` } : {};

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
      aria-label={`${rank ? `Number ${rank}, ` : ''}${movie.title}${
        hasScore
          ? `, rated ${movie.point} out of 10`
          : seasonChip
            ? `, season ${seasonChip.season} rated ${seasonChip.point} out of 10`
            : ''
      }`}
      className="card-enter group relative flex flex-col bg-transparent cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-300 dark:focus-visible:ring-offset-stone-950"
      style={{ '--card-index': staggerIndex } as React.CSSProperties}
    >
      {/* Image Container */}
      <div
        style={posterStyle}
        className="aspect-[2/3] w-full overflow-hidden relative rounded-lg shadow-sm transition-all duration-500 group-hover:shadow-2xl bg-stone-100 border border-stone-200 group-hover:border-stone-300 dark:bg-dark-card dark:border-white/5 dark:group-hover:border-white/20"
      >
        {/* Badges sit inside the poster frame. Hung outside it on negative offsets they were
            clipped by the top of the scroll container on the first row and collided with the
            neighbouring card's artwork everywhere else. Rank goes left, score right, so the
            two never meet. */}
        {/* The place, as the medal it is: crown, medal or award on an opaque gold, silver or
            bronze fill (`.medal-N` in index.css) with the numeral beside it. It was briefly a
            bare "No.1" numeral chip on black glass, which read as a label rather than a
            place. The fill is opaque with its own dark ink, so the poster behind it does not
            enter the contrast sum; the measured ratios live with the gradients in index.css.
            Kept alongside the podium because sorted by date or scrolled past it, this is the
            only thing that says which card it is. */}
        {rank && RANK_ICON[rank] && (
          <div
            className={clsx(
              `medal-${rank} medal-shine`,
              'absolute top-2 left-2 z-40 flex items-center gap-1 rounded-full pl-2 pr-2.5 py-1 font-wordmark text-base font-extrabold tabular-nums leading-none',
            )}
            style={{
              boxShadow: '0 0 0 1px rgb(255 255 255 / 0.35) inset, 0 4px 14px var(--medal-glow)',
              '--shine-delay': `${rank * 0.6}s`,
            } as React.CSSProperties}
          >
            {React.createElement(RANK_ICON[rank]!, {
              className: rank === 1 ? 'w-[18px] h-[18px]' : 'w-4 h-4',
              strokeWidth: 2.5,
              'aria-hidden': true,
            })}
            {rank}
          </div>
        )}
        {/* Past the three metals: the score chip's black/65 over any poster, white numeral
            6.98:1 against a pure-white poster (measured 2026-09-23). */}
        {rank && !RANK_ICON[rank] && (
          <div className="absolute top-2 left-2 z-40 rounded-full px-2 py-1 bg-black/65 text-white text-sm font-extrabold tabular-nums font-wordmark leading-none border border-white/10 backdrop-blur-md">
            {rank}
          </div>
        )}

        {/* The masthead accent, not rose-500: the two sat on screen together on the Watched
            grid as near-identical but unequal pinks. The darkened `-solid` rather than the
            bright accent because this is a fill under white text. */}
        {isNew && (
          <div
            className="absolute bottom-2 left-2 z-40 px-2 py-0.5 backdrop-blur-md shadow-lg border border-white/10 rounded-full flex items-center gap-1"
            style={{ backgroundColor: 'var(--accent-a-solid)' }}
          >
            <Sparkles className="w-2.5 h-2.5 text-white" />
            <span className="text-[10px] font-semibold text-white tracking-wide">NEW</span>
          </div>
        )}

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
        {/* Posters are printed to the edge of the frame, so the frame's own border sits
            behind them and does nothing. This hairline rides on top, which is the only thing
            separating a white-bordered poster from a light background. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10"
        />

        {/* The score, once. It used to print here and again under the title, and it carried
            a star, which reads as "out of five" on a scale that goes to ten. Suppressed
            entirely where there is no score to show: a watchlist or in-progress entry has
            point 0, and a card announcing "0" says something false about a film nobody has
            rated yet. The treatment carries how the number stands against the rest of the
            diary; the number itself is on screen either way, so the ramp is a second reading
            of it rather than the only one. */}
        {chip && (
          <div
            style={chip.style}
            className={clsx(
              'absolute top-2 right-2 z-30 py-0.5 rounded backdrop-blur-md shadow-lg border tabular-nums',
              chip.className,
            )}
          >
            {movie.point}
          </div>
        )}

        {/* A season score, for a series with no entry score of its own. Deliberately not on
            the SCORE_CHIP ramp: that ramp states where a number stands against RATED_POINTS,
            and season scores are not in that population, so banding one would claim a
            standing it does not have. It borrows mid's fill and ink instead, which is the
            pair measured against a pure-white poster (5.6:1 for stone-200, against the 4.5:1
            floor these sizes want). The season label rides at the same ink for that reason
            and separates itself by size and weight, not by contrast. */}
        {seasonChip && (
          <div className="absolute top-2 right-2 z-30 flex items-baseline gap-1 py-0.5 px-2 rounded backdrop-blur-md shadow-lg border bg-black/65 text-stone-200 border-white/10">
            <span className="text-[10px] font-normal tabular-nums">S{seasonChip.season}</span>
            <span className="text-sm font-medium tabular-nums">{seasonChip.point}</span>
          </div>
        )}
      </div>

      {/* Content - Minimalist below card */}
      <div className="pt-3 flex flex-col gap-1">
        <h2 className="text-sm font-medium leading-snug transition-colors line-clamp-1 text-stone-800 group-hover:text-stone-950 dark:text-stone-200 dark:group-hover:text-white">
          {movie.title}
        </h2>

        {/* Year and country, separated by space rather than a middle dot, and no longer
            trailed by a second copy of the score. The all-caps genre strings that sat below
            this are gone: they repeated what the filter row above the grid already offers,
            in the lowest-contrast type on the page, over the artwork the grid exists to
            show. */}
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          {year && <span className="tabular-nums">{year}</span>}
          {displayFlag && (
            <span className="text-sm leading-none" title={movie.national}>{displayFlag}</span>
          )}
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
