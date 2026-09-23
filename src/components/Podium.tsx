import React from 'react';
import { clsx } from 'clsx';
import type { Movie } from '../types';
import type { PodiumStep } from '../podium';
import { PODIUM_TIED_NAMES } from '../constants';
import { tmdbResize, tmdbSrcSet } from '../tmdbImage';

/**
 * Where each place stands, indexed by rank - 1: first in the middle, second to its left,
 * third to its right. By rank rather than by position in the list, so a place a tie used up
 * stays an empty slot (see the spacer below) instead of the next step sliding into it and
 * pulling first off centre. The DOM keeps rank order so a screen reader hears first, second,
 * third; only `order` moves them.
 *
 * Still a row on a phone, not a stack. At 400px the three steps come out about 130 / 95 /
 * 95px wide, which is a readable poster, and a stack would push the grid a full screen down
 * to show three films the grid itself also contains.
 *
 * One slot per place up to RANK_LIMIT (3). Raising the limit means adding a slot here, or
 * the extra places are ranked and badged on the grid but never stood on the podium.
 */
const SLOT: { order: string; width: string; sizes: string }[] = [
  { order: 'order-2', width: 'w-[38%] sm:w-44 lg:w-48', sizes: '(min-width: 1024px) 192px, (min-width: 640px) 176px, 38vw' },
  { order: 'order-1', width: 'w-[29%] sm:w-36', sizes: '(min-width: 640px) 144px, 29vw' },
  { order: 'order-3', width: 'w-[29%] sm:w-36', sizes: '(min-width: 640px) 144px, 29vw' },
];

/**
 * The plinth under each step, by rank rather than slot, so a tie reads correctly: with two
 * films sharing first, the step beside them is third and stands at third's height.
 *
 * Numeral contrast, measured 2026-09-23 from the rendered colours against each plinth's own
 * fill. The numerals are 24-48px extrabold, so the WCAG large-text floor of 3:1 applies:
 * - first, accent ink: #d61f6d on stone-200 (#e7e5e4) 3.91:1 light, #ff4d97 on stone-900
 *   (#1c1917) 5.63:1 dark
 * - second and third: stone-500 (#79716b) on stone-200 3.81:1 light, stone-400 (#a6a09b)
 *   on stone-900 6.76:1 dark
 * The 11px tie line is stone-500 on the stone-50 page, 4.58:1 against a 4.5:1 floor, so it
 * cannot go a step lighter.
 */
const PLINTH: Record<number, { height: string; numeral: string }> = {
  1: { height: 'h-16 sm:h-20', numeral: 'text-[36px] sm:text-5xl' },
  2: { height: 'h-11 sm:h-14', numeral: 'text-[28px] sm:text-4xl text-stone-500 dark:text-stone-400' },
  3: { height: 'h-8 sm:h-10', numeral: 'text-[24px] sm:text-3xl text-stone-500 dark:text-stone-400' },
};

const ORDINAL: Record<number, string> = { 1: 'First', 2: 'Second', 3: 'Third' };

interface PodiumProps {
  steps: PodiumStep[];
  /** Size of the rated list the places are out of. */
  total: number;
  /** Which film, if any, currently owns the shared poster view-transition-name here. */
  transitioningId: string;
  selectedId: string;
  onOpen: (movie: Movie, fromPoster: boolean) => void;
}

export const Podium: React.FC<PodiumProps> = ({ steps, total, transitioningId, selectedId, onOpen }) => {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="podium-heading" className="mb-14">
      <div className="mb-6 flex items-baseline gap-3">
        <h2
          id="podium-heading"
          className="font-wordmark text-xl sm:text-2xl font-extrabold tracking-[-0.02em] text-stone-900 dark:text-stone-50"
        >
          Highest rated
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">of {total} films</p>
      </div>

      <ol className="flex items-end justify-center gap-2.5 sm:gap-5">
        {SLOT.map((slot, i) => {
          const step = steps.find(s => s.rank === i + 1);
          // No step holds this place: either a tie above used it up (two films sharing first
          // leave no second), which gets an empty slot to keep the others where they stand,
          // or the diary has fewer scores than places, which gets nothing.
          if (!step) {
            return steps.some(s => s.rank > i + 1) ? (
              <li key={`empty-${i}`} aria-hidden="true" className={clsx(slot.order, slot.width)} />
            ) : null;
          }
          return (
            <PodiumPlace
              key={step.point}
              step={step}
              slot={slot}
              index={i}
              transitioningId={transitioningId}
              selectedId={selectedId}
              onOpen={onOpen}
            />
          );
        })}
      </ol>
    </section>
  );
};

interface PodiumPlaceProps {
  step: PodiumStep;
  slot: (typeof SLOT)[number];
  index: number;
  transitioningId: string;
  selectedId: string;
  onOpen: (movie: Movie, fromPoster: boolean) => void;
}

const PodiumPlace: React.FC<PodiumPlaceProps> = ({ step, slot, index, transitioningId, selectedId, onOpen }) => {
  const [lead, ...tied] = step.movies;
  const plinth = PLINTH[step.rank] ?? PLINTH[3];
  const isFirst = step.rank === 1;
  // Same hand-off rule as MovieCard: the name is worn only while this poster is the one
  // morphing into or out of the modal, and dropped while the modal itself holds it.
  const posterStyle: React.CSSProperties =
    lead.id === transitioningId && lead.id !== selectedId
      ? { viewTransitionName: `poster-${lead.id}` }
      : {};
  const named = tied.slice(0, PODIUM_TIED_NAMES);
  const folded = tied.length - named.length;
  const place = ORDINAL[step.rank] ?? `No. ${step.rank}`;

  return (
    <li
      className={clsx('podium-enter flex flex-col', slot.order, slot.width)}
      style={{ '--podium-index': index } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(lead, true)}
        aria-label={`${place} place, ${lead.title}, rated ${step.point} out of 10`}
        className="group flex flex-col text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-300 dark:focus-visible:ring-offset-stone-950"
      >
        <div
          style={posterStyle}
          className={clsx(
            'relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-dark-card',
            'transition-[transform,box-shadow] duration-500 ease-out motion-safe:group-hover:-translate-y-1',
            isFirst ? 'shadow-xl group-hover:shadow-2xl' : 'shadow-md group-hover:shadow-xl',
          )}
        >
          {lead.cover_image && (
            <img
              src={tmdbResize(lead.cover_image, 'w342')}
              srcSet={tmdbSrcSet(lead.cover_image, ['w185', 'w342', 'w500', 'w780'])}
              sizes={slot.sizes}
              alt=""
              decoding="async"
              className="h-full w-full object-cover"
            />
          )}
          {/* Hairline on top of the artwork, as on the grid card: it is the only edge a
              white-bordered poster has against the light page. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10"
          />
        </div>

        {/* The title is held to two lines' height whether it needs them or not, so every
            step's score sits the same distance above its plinth. The score is here rather
            than as a chip on the poster: on the podium the number is the point, and a chip
            over artwork is what the grid does for sixty films at once. */}
        <div className="mt-2.5 mb-2 flex flex-col items-center text-center">
          <h3
            className={clsx(
              'line-clamp-2 leading-snug text-stone-800 group-hover:text-stone-950 dark:text-stone-200 dark:group-hover:text-white',
              isFirst
                ? 'min-h-[2.2rem] sm:min-h-[2.6rem] text-[13px] sm:text-[15px] font-semibold'
                : 'min-h-[2rem] sm:min-h-[2.3rem] text-xs sm:text-sm font-medium',
            )}
          >
            {lead.title}
          </h3>
          <span
            className={clsx(
              'mt-0.5 tabular-nums font-semibold text-stone-600 dark:text-stone-300',
              isFirst ? 'text-sm sm:text-base' : 'text-xs sm:text-sm',
            )}
          >
            {step.point}
          </span>
        </div>
      </button>

      {/* Below `sm` a flank step is under 100px wide, and two tied titles ran to six lines
          there (measured 2026-09-23 at 400px), so the phone gets the count only. The tied
          films carry the same rank marker in the grid, which is where they are found. */}
      {tied.length > 0 && (
        <p className="mb-2 text-center text-[11px] leading-snug text-stone-500 dark:text-stone-400 sm:hidden">
          Tied with {tied.length} {tied.length === 1 ? 'other' : 'others'}
        </p>
      )}
      {tied.length > 0 && (
        <p className="mb-2 hidden sm:block text-center text-[11px] leading-snug text-stone-500 dark:text-stone-400">
          Tied with{' '}
          {named.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && (i === named.length - 1 && folded === 0 ? ' and ' : ', ')}
              <button
                type="button"
                onClick={() => onOpen(m, false)}
                className="underline decoration-stone-300 underline-offset-2 hover:text-stone-800 dark:decoration-stone-600 dark:hover:text-stone-200"
              >
                {m.title}
              </button>
            </React.Fragment>
          ))}
          {folded > 0 && ` and ${folded} more`}
        </p>
      )}

      {/* Hidden from assistive tech: the button's label already says the place. First
          gets the accent as a rule along its top edge, the one coloured plinth. */}
      <div
        aria-hidden="true"
        className={clsx(
          'flex justify-center rounded-t-md pt-1.5 bg-stone-200 dark:bg-dark-card',
          isFirst && 'border-t-2',
          plinth.height,
        )}
        style={isFirst ? { borderTopColor: 'var(--accent-a-solid)' } : undefined}
      >
        <span
          className={clsx('font-wordmark font-extrabold leading-none tabular-nums', plinth.numeral)}
          style={isFirst ? { color: 'var(--accent-a-ink)' } : undefined}
        >
          {step.rank}
        </span>
      </div>
    </li>
  );
};
