import React, { useEffect, useRef } from 'react';
import { X, Calendar, Film, Star, Quote } from 'lucide-react';
import { Movie } from '../types';
// Intl rather than date-fns `format(d, 'MMMM d, yyyy')`, which produces the same string but
// only by shipping the token parser and the en-US locale. The modal is mounted from the
// entry chunk (it has to be there the instant a card is clicked, and the View Transition
// needs it in the same commit), so an import here is an import everyone pays for. UTC to
// match the midnight-UTC ISO strings parseMovie writes.
const LONG_DATE = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
import { StreamingBadges } from './StreamingBadges';
import { tmdbResize, tmdbSrcSet } from '../tmdbImage';

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({ movie, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (movie) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [movie]);

  // Move focus into the dialog on open, restore it to the opener on close.
  useEffect(() => {
    if (!movie) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previouslyFocused.current?.focus?.();
  }, [movie]);

  // Esc to close, and trap Tab focus within the dialog.
  useEffect(() => {
    if (!movie) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [movie, onClose]);

  if (!movie) return null;

  const posterStyle: React.CSSProperties = { viewTransitionName: `poster-${movie.id}` };

  const formatDate = (value: string): string | null => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : LONG_DATE.format(d);
  };
  const releasedLabel = movie.release_date ? formatDate(movie.release_date) : null;
  const watchedLabel = movie.watch_date ? formatDate(movie.watch_date) : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm bg-stone-900/50 dark:bg-stone-950/90"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-detail-title"
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden bg-white border border-stone-200 dark:bg-stone-900 dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-md border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image Section (Top on mobile, Left on desktop) */}
        <div
          style={posterStyle}
          className="w-full md:w-2/5 h-64 md:h-auto relative shrink-0 bg-stone-100 dark:bg-stone-950"
        >
          {/* Same split as the card: a throwaway width behind blur-3xl, and a poster sized
              for the panel it fills (2/5 of a max-w-4xl dialog, so ~360px, w780 covering a
              2x display) rather than the 2000x3000 original. */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <img
              src={tmdbResize(movie.cover_image, 'w154')}
              alt=""
              decoding="async"
              className="w-full h-full object-cover blur-3xl scale-125 opacity-40 grayscale-[0.3]"
            />
          </div>
          <img
            src={tmdbResize(movie.cover_image, 'w780')}
            srcSet={tmdbSrcSet(movie.cover_image, ['w342', 'w500', 'w780'])}
            sizes="(min-width: 768px) 40vw, 100vw"
            alt={movie.title}
            className="relative z-10 w-full h-full object-contain md:object-cover p-4 md:p-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-white dark:from-stone-900 dark:md:to-stone-900 opacity-90 md:opacity-100" />
        </div>

        {/* Info Section */}
        <div className="flex-1 p-8 md:p-12 flex flex-col gap-8 relative bg-white dark:bg-stone-900">
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {movie.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h2 id="movie-detail-title" className="text-3xl md:text-4xl font-bold leading-tight mb-3 text-stone-900 dark:text-stone-100">
              {movie.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500">
              {releasedLabel && (
                <div className="flex items-center gap-1.5">
                  <Film className="w-4 h-4" />
                  <span className="tabular-nums">Released: {releasedLabel}</span>
                </div>
              )}
              {watchedLabel && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span className="tabular-nums">Watched: {watchedLabel}</span>
                </div>
              )}
              {movie.published && (
                <div className="flex items-center gap-1 font-medium tabular-nums text-stone-700 dark:text-stone-300">
                  <Star className="w-4 h-4 fill-stone-700 dark:fill-stone-300" />
                  <span>{movie.point}/10</span>
                </div>
              )}
            </div>

            <StreamingBadges movie={movie} variant="detail" />
          </div>

          <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {movie.summary && (
              <div className="leading-relaxed text-sm md:text-base border-l-2 pl-4 text-stone-600 border-stone-300 dark:text-stone-400 dark:border-stone-800">
                {movie.summary}
              </div>
            )}

            {movie.impression && (
              <div className="relative p-6 rounded-lg border bg-stone-100 border-stone-200 dark:bg-stone-800/50 dark:border-stone-800">
                <Quote className="absolute top-4 left-4 w-6 h-6 text-stone-400 fill-stone-400/20 dark:text-stone-600 dark:fill-stone-600/20" />
                <div className="relative z-10 text-lg md:text-xl font-medium italic leading-relaxed pt-2 pl-4 text-stone-800 dark:text-stone-200">
                  &ldquo;{movie.impression}&rdquo;
                </div>
              </div>
            )}

            {!movie.summary && !movie.impression && (
              <div className="prose prose-sm max-w-none dark:prose-invert text-stone-600 dark:text-stone-400">
                {movie.content}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
