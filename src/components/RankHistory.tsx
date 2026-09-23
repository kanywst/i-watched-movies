import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import type { Movie } from '../types';
import { computeRankHistory, type RankEvent, type Reign } from '../rankHistory';
import { RANK_LIMIT } from '../constants';
import { tmdbResize } from '../tmdbImage';

interface RankHistoryProps {
  /** The rated films, the same list the rank badges are cut from. */
  watched: Movie[];
  onOpenMovie: (movie: Movie) => void;
}

// UTC because parseMovie writes midnight-UTC ISO strings; read locally they land on the
// previous day west of UTC.
const DATE = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const formatDate = (iso: string) => DATE.format(new Date(iso));

// Zero days means two different things. For the current holder it was taken today; for a
// closed reign it was taken and lost on the same watch_date (a higher score watched later
// that day), which can be years back, so "today" would be false there.
const formatDays = (days: number, current: boolean) =>
  days === 0 ? (current ? 'taken today' : 'lost the same day') : days === 1 ? '1 day' : `${days} days`;

export const RankHistory: React.FC<RankHistoryProps> = ({ watched, onOpenMovie }) => {
  const { events, reigns } = useMemo(
    () => computeRankHistory(watched, RANK_LIMIT, new Date()),
    [watched],
  );

  if (reigns.length === 0) {
    return <p className="text-sm text-stone-500">No dated, rated film to start from yet.</p>;
  }

  // Bars are scaled to the longest reign on show, so a short one still reads as short
  // rather than vanishing, and the longest always spans the track.
  const longest = Math.max(1, ...reigns.map(r => r.days));

  return (
    <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
      <div className="flex flex-col gap-3 min-w-0">
        <Label>Every #1, newest first</Label>
        <ol className="flex flex-col gap-3">
          {[...reigns].reverse().map(reign => (
            <li key={reign.holder.id}>
              <ReignRow reign={reign} longest={longest} onOpenMovie={onOpenMovie} />
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <Label>Every change to the top {RANK_LIMIT}</Label>
        <ol className="flex flex-col">
          {[...events].reverse().map(event => (
            <li
              key={event.entrant.id}
              className="border-b border-stone-200 dark:border-white/10 last:border-b-0"
            >
              <EventRow event={event} onOpenMovie={onOpenMovie} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

interface ReignRowProps {
  reign: Reign;
  longest: number;
  onOpenMovie: (movie: Movie) => void;
}

const ReignRow: React.FC<ReignRowProps> = ({ reign, longest, onOpenMovie }) => {
  const current = reign.to === null;
  const { holder } = reign;
  return (
    <button
      type="button"
      onClick={() => onOpenMovie(holder)}
      className="flex items-center gap-3 w-full text-left p-2 -m-2 rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
    >
      <img
        src={tmdbResize(holder.cover_image, 'w92')}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-10 h-14 object-cover rounded-sm bg-stone-100 dark:bg-dark-surface shrink-0"
      />
      <span className="flex flex-col gap-1.5 min-w-0 flex-1">
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium leading-tight text-stone-800 dark:text-stone-200 truncate">
            {holder.title}
          </span>
          <span className="shrink-0 text-sm tabular-nums text-stone-500">{holder.point}</span>
        </span>
        <span className="relative h-1.5 w-full rounded-sm bg-stone-200/70 dark:bg-white/10" aria-hidden="true">
          <span
            className={clsx(
              'absolute inset-y-0 left-0 rounded-sm',
              !current && 'bg-stone-400 dark:bg-stone-500',
            )}
            style={{
              width: `${(reign.days / longest) * 100}%`,
              // A reign taken today is zero days long; a sliver still marks where it sits.
              minWidth: 3,
              ...(current ? { backgroundColor: 'var(--accent-a-solid)' } : {}),
            }}
          />
        </span>
        <span className="flex flex-wrap gap-x-2 text-[11px] text-stone-500 tabular-nums">
          <span>
            {current
              ? `holding since ${formatDate(reign.from)}`
              : `${formatDate(reign.from)} to ${formatDate(reign.to!)}`}
          </span>
          <span className={clsx(current && 'font-medium')} style={current ? { color: 'var(--accent-a-ink)' } : undefined}>
            {formatDays(reign.days, current)}
          </span>
        </span>
      </span>
    </button>
  );
};

interface EventRowProps {
  event: RankEvent;
  onOpenMovie: (movie: Movie) => void;
}

const EventRow: React.FC<EventRowProps> = ({ event, onOpenMovie }) => (
  <button
    type="button"
    onClick={() => onOpenMovie(event.entrant)}
    className="flex items-baseline gap-3 w-full text-left py-2.5 text-sm rounded-sm hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
  >
    <span className="w-24 shrink-0 text-xs tabular-nums text-stone-500">
      {formatDate(event.date)}
    </span>
    <span className="flex flex-col gap-0.5 min-w-0 flex-1">
      <span className="flex items-baseline gap-2 min-w-0">
        <span
          className={clsx(
            'shrink-0 text-xs font-semibold tabular-nums',
            event.rank !== 1 && 'text-stone-500 dark:text-stone-400',
          )}
          style={event.rank === 1 ? { color: 'var(--accent-a-ink)' } : undefined}
        >
          #{event.rank}
        </span>
        <span className="truncate text-stone-700 dark:text-stone-200">{event.entrant.title}</span>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-stone-500">
          {event.entrant.point}
        </span>
      </span>
      {event.displaced && (
        <span className="truncate text-[11px] text-stone-500">
          pushes out {event.displaced.title}
        </span>
      )}
    </span>
  </button>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-medium text-stone-500 dark:text-stone-400">{children}</div>
);
