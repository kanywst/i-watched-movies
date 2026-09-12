import React, { useEffect, useRef } from 'react';
import { X, Quote } from 'lucide-react';
import { clsx } from 'clsx';
import { Language, Movie } from '../types';
import { LANGUAGE_OPTIONS } from '../constants';
import { StreamingBadges } from './StreamingBadges';
import { isWatched } from '../partition';
import { RATED_POINTS } from '../collections';
import { bandOf, countRatedBelow, type ScoreBand } from '../scoreBand';
import { tmdbResize, tmdbSrcSet } from '../tmdbImage';

/**
 * The score numeral, by where it stands in the diary (src/scoreBand.ts). Only one film is
 * on screen here, so colour alone would have nothing to be compared against; the standing
 * is stated in words under the rule and the ink is the echo of it. The top band is the one
 * place on the page besides the masthead where the accent is spent.
 *
 * The numeral renders at 60-72px, which is WCAG large text and so wants 3:1, and the ramp is
 * floored by that rather than by how quiet the low band could look: stone-400 reaches only
 * 2.59:1 on the white panel and is unusable here however well it reads as recessive. Against
 * white / stone-900 the four are 4.79/3.65, 7.64/6.76, 17.5/15.8 and 4.9/5.6. Low needs no
 * dark variant, since stone-500 clears the floor on both grounds; the accent is the one band
 * not ordered by contrast, because it separates itself by hue instead.
 */
const SCORE_INK: Record<ScoreBand, { className: string; style?: React.CSSProperties }> = {
  low: { className: 'text-stone-500' },
  mid: { className: 'text-stone-600 dark:text-stone-400' },
  high: { className: 'text-stone-900 dark:text-stone-100' },
  top: { className: '', style: { color: 'var(--accent-a-ink)' } },
};

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

interface MovieDetailModalProps {
  movie: Movie | null;
  lang: Language;
  setLanguage: (next: Language) => void;
  onClose: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  lang,
  setLanguage,
  onClose,
}) => {
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
  // Read even for an unrated entry, where `point` is 0 and nothing below renders it.
  const scoreBand = bandOf(RATED_POINTS, movie.point);
  const releasedLabel = movie.release_date ? formatDate(movie.release_date) : null;
  const watchedLabel = movie.watch_date ? formatDate(movie.watch_date) : null;

  // Per movie, not per site, and the fallback runs both ways: the two fields are
  // independently optional in `Movie`, so whichever one an entry has is what gets shown
  // rather than the block going blank in one language. `lang` on the element follows the
  // text that actually rendered, which is what screen readers and CJK font selection read.
  const summaryEn = movie.summary || '';
  const summaryJa = movie.summary_ja || '';
  const showJa = lang === 'ja' ? Boolean(summaryJa) : !summaryEn && Boolean(summaryJa);
  const summary = showJa ? summaryJa : summaryEn;
  const summaryLang = showJa ? 'ja' : 'en';
  // Only worth offering when there are in fact two texts to switch between.
  const canSwitchLanguage = Boolean(summaryEn && summaryJa);

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
          // Opaque enough to read on both surfaces it can land on: the dark poster at the
          // top of the mobile layout, and the white info panel it now shares a line with on
          // desktop, where bg-black/20 left a white glyph on pale grey.
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/55 hover:bg-black/75 text-white transition-colors backdrop-blur-md border border-white/15"
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
            {/* The score, set as the largest thing in the dialog. Everything else here comes
                from TMDB and is true of the film for everyone; this number is the only piece
                of the page that is the diarist's, and it was previously an inline run of
                body text reading "8.8/10" behind a star, on a scale that goes to ten. The
                denominator stays small under a rule: it is context, not a second figure. */}
            {/* The denominator answers "out of what", which is the smaller question. The
                line under it answers the one a 7.7 actually raises, since a scale nobody
                else uses only means something against the rest of the diary: half of these
                ratings sit inside a single point of each other, so the same 7.7 reads as
                middling here and would read as high almost anywhere else.

                A count of films beaten rather than the percentile the bands are cut on. The
                sentence claims a strict comparison, and countRatedBelow is the figure that
                supports one; the percentile splits ties, which is right for a band and would
                be a false claim in this wording. */}
            {isWatched(movie) && (
              <div className="mb-6">
                <div className="inline-flex flex-col items-start leading-none">
                  <span
                    style={SCORE_INK[scoreBand].style}
                    className={clsx(
                      'text-6xl md:text-7xl font-light tabular-nums tracking-tight',
                      SCORE_INK[scoreBand].className,
                    )}
                  >
                    {movie.point}
                  </span>
                  <span aria-hidden="true" className="mt-2.5 w-full border-t border-stone-300 dark:border-stone-700" />
                  <span className="mt-1.5 text-sm tabular-nums text-stone-400 dark:text-stone-500">
                    <span className="sr-only">out of </span>10
                  </span>
                </div>
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                  Higher than{' '}
                  <span className="tabular-nums text-stone-700 dark:text-stone-300">
                    {countRatedBelow(RATED_POINTS, movie.point)}
                  </span>{' '}
                  of the {RATED_POINTS.length}{' '}
                  {RATED_POINTS.length === 1 ? 'film' : 'films'} rated here.
                </p>
              </div>
            )}

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

            <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm text-stone-500 dark:text-stone-400">
              {releasedLabel && (
                <div className="flex items-baseline gap-1.5">
                  <dt>Released</dt>
                  <dd className="tabular-nums text-stone-700 dark:text-stone-300">{releasedLabel}</dd>
                </div>
              )}
              {watchedLabel && (
                <div className="flex items-baseline gap-1.5">
                  <dt>Watched</dt>
                  <dd className="tabular-nums text-stone-700 dark:text-stone-300">{watchedLabel}</dd>
                </div>
              )}
            </dl>

            <StreamingBadges movie={movie} variant="detail" />
          </div>

          <div className="space-y-8 overflow-y-auto pr-2 custom-scrollbar">
            {summary && (
              <div>
                {/* The masthead carries the same switch, but the overlay sits on top of the
                    header, so from inside an open modal it cannot be reached. The summary
                    is the only thing the language changes, so the control belongs next to
                    it too. Same persisted state either way. */}
                {canSwitchLanguage && (
                  <div
                    role="group"
                    aria-label="Summary language"
                    className="flex justify-end gap-1 mb-2 text-[11px] font-semibold"
                  >
                    {LANGUAGE_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setLanguage(o.value)}
                        aria-pressed={lang === o.value}
                        title={o.title}
                        className={clsx(
                          'px-2 py-0.5 rounded-full transition-colors',
                          lang === o.value
                            ? 'bg-stone-200 text-stone-900 dark:bg-stone-700 dark:text-stone-100'
                            : 'text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-300',
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  lang={summaryLang}
                  className="leading-relaxed text-sm md:text-base border-l-2 pl-4 text-stone-600 border-stone-300 dark:text-stone-400 dark:border-stone-800"
                >
                  {summary}
                </div>
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
