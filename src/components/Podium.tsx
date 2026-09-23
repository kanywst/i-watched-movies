import React from 'react';
import { clsx } from 'clsx';
import { Crown, Sparkle, Star, Trophy } from 'lucide-react';
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
 * 95px wide, which is a readable poster, and all three stay in one screen. Sized up on
 * desktop since the podium became the whole Top page rather than a header over the grid.
 *
 * One slot per place up to RANK_LIMIT (3). Raising the limit means adding a slot here, or
 * the extra places are ranked and badged on the grid but never stood on the podium.
 */
const SLOT: { order: string; width: string; sizes: string }[] = [
  { order: 'order-2', width: 'w-[38%] sm:w-52 lg:w-64', sizes: '(min-width: 1024px) 256px, (min-width: 640px) 208px, 38vw' },
  { order: 'order-1', width: 'w-[29%] sm:w-40 lg:w-48', sizes: '(min-width: 1024px) 192px, (min-width: 640px) 160px, 29vw' },
  { order: 'order-3', width: 'w-[29%] sm:w-40 lg:w-48', sizes: '(min-width: 1024px) 192px, (min-width: 640px) 160px, 29vw' },
];

/**
 * The plinth under each step, by rank rather than slot, so a tie reads correctly: with two
 * films sharing first, the step beside them is third and stands at third's height.
 *
 * Each plinth is a solid gold, silver or bronze block (`.medal-N` in index.css) and the
 * numeral takes that class's dark ink, so its contrast is the one measured there against
 * every stop of the gradient, 4.70:1 at the worst, well past the 3:1 a 28-56px numeral needs.
 */
const PLINTH: Record<number, { height: string; numeral: string }> = {
  1: { height: 'h-24 sm:h-32', numeral: 'text-[40px] sm:text-6xl' },
  2: { height: 'h-14 sm:h-20', numeral: 'text-[30px] sm:text-5xl' },
  3: { height: 'h-10 sm:h-14', numeral: 'text-[26px] sm:text-4xl' },
};

/**
 * The metal a place stands on. Three metals exist (`.medal-1` to `.medal-3` in index.css);
 * that is independent of RANK_LIMIT, and a place past third, which only a raised limit plus
 * a new SLOT could produce, stands on bronze rather than on an undefined class.
 */
const medalOf = (rank: number) => Math.min(rank, 3);

/**
 * Confetti over first place. Positions come from the index rather than Math.random so a
 * render is pure and the burst looks the same every time. Colours are the three metals plus
 * the masthead accent, so the confetti belongs to this page rather than to a party template.
 */
const CONFETTI_COLOURS = ['#fbbf24', '#fde68a', '#f59e0b', '#e2e8f0', '#e8894a', '#ff4d97'];
const CONFETTI = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  delay: `${((i * 7) % 13) * 0.09}s`,
  drift: `${((i * 53) % 90) - 45}px`,
  spin: `${((i * 97) % 540) + 180}deg`,
  colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
  shape: i % 3 === 0 ? 'rounded-full w-1.5 h-1.5' : 'w-1.5 h-2.5 rounded-[1px]',
}));

/** Sparkles round the crown: pixel offset from the poster's top centre, size, and when each twinkles. */
const SPARKLES = [
  { x: '-44px', y: '-6px', size: 'h-3 w-3 sm:h-4 sm:w-4', delay: '0s' },
  { x: '30px', y: '-14px', size: 'h-2.5 w-2.5 sm:h-3.5 sm:w-3.5', delay: '0.7s' },
  { x: '40px', y: '14px', size: 'h-2 w-2 sm:h-3 sm:w-3', delay: '1.3s' },
  { x: '-54px', y: '20px', size: 'h-2 w-2 sm:h-2.5 sm:w-2.5', delay: '1.9s' },
];

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
    <section aria-labelledby="podium-heading" className="relative mb-14">
      {/* A spotlight on the winner: a soft gold bloom behind the middle step. Decoration,
          so it sits under everything and takes no pointer events. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 -z-0 h-72 w-[min(640px,90%)] -translate-x-1/2 rounded-full blur-3xl opacity-60 dark:opacity-70"
        style={{ background: 'radial-gradient(closest-side, rgb(251 191 36 / 0.55), rgb(251 191 36 / 0.15) 60%, transparent)' }}
      />
      <div className="relative mb-6 flex items-baseline gap-3">
        <Trophy aria-hidden="true" className="h-5 w-5 self-center text-amber-500" strokeWidth={2.25} />
        <h2
          id="podium-heading"
          className="font-wordmark text-xl sm:text-2xl font-extrabold tracking-[-0.02em] text-stone-900 dark:text-stone-50"
        >
          Highest rated
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">of {total} films</p>
      </div>

      <ol className="relative flex items-end justify-center gap-2.5 pt-8 sm:gap-6 sm:pt-10">
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
      className={clsx('podium-enter flex flex-col', `medal-tone-${medalOf(step.rank)}`, slot.order, slot.width)}
      style={{ '--podium-index': index } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => onOpen(lead, true)}
        aria-label={`${place} place, ${lead.title}, rated ${step.point} out of 10`}
        className="group flex flex-col text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-stone-400 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-300 dark:focus-visible:ring-offset-stone-950"
      >
        <div className="relative isolate">
        {isFirst && (
          <>
            {/* A slow sunburst behind the winner. Rotated by transform, so it stays on the
                compositor; under reduced motion it simply stands still. */}
            <div
              aria-hidden="true"
              className="podium-rays pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[260%]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-10 z-30 h-0">
              {CONFETTI.map((c, i) => (
                <span
                  key={i}
                  className={clsx('confetti absolute top-0', c.shape)}
                  style={{
                    left: c.left,
                    backgroundColor: c.colour,
                    '--confetti-delay': c.delay,
                    '--confetti-drift': c.drift,
                    '--confetti-spin': c.spin,
                  } as React.CSSProperties}
                />
              ))}
            </div>
            {SPARKLES.map((sp, i) => (
              <Sparkle
                key={i}
                aria-hidden="true"
                className={clsx('sparkle-twinkle absolute left-1/2 -top-6 sm:-top-8 z-20 text-amber-300', sp.size)}
                fill="currentColor"
                strokeWidth={0}
                style={{ '--sparkle-x': sp.x, '--sparkle-y': sp.y, '--sparkle-delay': sp.delay } as React.CSSProperties}
              />
            ))}
          </>
        )}
        {isFirst && (
          <Crown
            aria-hidden="true"
            className="crown-float absolute left-1/2 -top-7 sm:-top-9 z-10 h-9 w-9 sm:h-12 sm:w-12 drop-shadow-[0_2px_10px_rgb(251_191_36/0.8)]"
            fill="#fbbf24"
            stroke="#92400e"
            strokeWidth={1.5}
          />
        )}
        <div
          style={{
            ...posterStyle,
            // The metal as a ring round the poster plus a glow in the same tone, so the three
            // steps read as gold, silver and bronze before the plinths are even in view.
            boxShadow: isFirst
              ? '0 0 0 3px var(--medal-ring), 0 12px 48px var(--medal-glow)'
              : '0 0 0 2px var(--medal-ring), 0 8px 28px var(--medal-glow)',
          }}
          className={clsx(
            'relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-stone-100 dark:bg-dark-card',
            'transition-transform duration-500 ease-out motion-safe:group-hover:-translate-y-1.5 motion-safe:group-hover:scale-[1.02]',
            isFirst && 'medal-shine',
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
          {/* First's score sits on a gold pill in the gold ink measured in index.css, so it
              reads the same on the light and the dark page. */}
          {isFirst ? (
            <span
              className="medal-1 medal-shine relative mt-1.5 inline-flex items-center gap-1 rounded-full px-3 py-1 font-wordmark text-lg sm:text-2xl font-extrabold tabular-nums leading-none"
              style={{ boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.7), 0 6px 20px var(--medal-glow)', '--shine-delay': '2s' } as React.CSSProperties}
            >
              <Star aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="currentColor" strokeWidth={0} />
              {step.point}
            </span>
          ) : (
            <span className="mt-0.5 font-wordmark tabular-nums font-extrabold text-base sm:text-lg text-stone-900 dark:text-stone-50">
              {step.point}
            </span>
          )}
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

      {/* Hidden from assistive tech: the button's label already says the place. Each
          plinth is a solid block of its metal. */}
      <div
        aria-hidden="true"
        className={clsx(
          `medal-${medalOf(step.rank)} medal-shine`,
          'relative flex flex-col items-center rounded-t-md pt-2',
          plinth.height,
        )}
        style={{
          boxShadow: 'inset 0 1px 0 rgb(255 255 255 / 0.7), inset 0 -10px 18px rgb(0 0 0 / 0.12), 0 10px 30px var(--medal-glow)',
          '--shine-delay': `${step.rank * 0.8}s`,
        } as React.CSSProperties}
      >
        <span className={clsx('font-wordmark font-extrabold leading-none tabular-nums drop-shadow-[0_1px_0_rgb(255_255_255/0.5)]', plinth.numeral)}>
          {step.rank}
        </span>
        {/* Engraved on first's plinth only, in the same gold ink. */}
        {isFirst && (
          <span className="mt-1 sm:mt-1.5 text-[8px] sm:text-[10px] font-extrabold tracking-[0.3em] pl-[0.3em]">
            CHAMPION
          </span>
        )}
      </div>
    </li>
  );
};
