import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Flame, Trophy, CalendarCheck, Clapperboard } from 'lucide-react';
import type { Movie } from '../types';
import type { ActivityDay, ActivitySummary } from '../activity';
import { Stat } from './ui/Stat';

interface ActivityHeatmapProps {
  summary: ActivitySummary;
  onOpenMovie: (movie: Movie) => void;
}

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT_PAD = 30; // weekday labels
const TOP_PAD = 18; // month labels
const WEEKDAY_ROWS: Record<number, string> = { 1: 'Mon', 3: 'Wed', 5: 'Fri' };
// Grace period so moving the pointer from a cell into its tooltip does not dismiss it.
const CLOSE_DELAY_MS = 120;

// Build the local date at noon so DST midnight transitions can't shift the calendar day.
const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
const fmtDay = (iso: string) => format(parseIso(iso), 'EEE, MMM d, yyyy');

interface HoverState {
  day: ActivityDay;
  w: number;
  d: number;
  rect: DOMRect;
  // Set when a multi-film day was opened via keyboard, so focus moves into the tooltip.
  viaKeyboard?: boolean;
  cell?: SVGRectElement | null;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ summary, onOpenMovie }) => {
  const { weeks, monthLabels, total, activeDays, busiestDay, currentStreak, longestStreak, monthly } =
    summary;
  const [hover, setHover] = useState<HoverState | null>(null);
  const closeTimer = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const openHover = useCallback(
    (h: HoverState) => {
      cancelClose();
      setHover(h);
    },
    [cancelClose],
  );
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setHover(null), CLOSE_DELAY_MS);
  }, [cancelClose]);
  // Keep handleOpen referentially stable across every parent re-render (App recreates
  // onOpenMovie each render) so the memoised DayCells never re-render just because of it.
  const onOpenMovieRef = useRef(onOpenMovie);
  useEffect(() => {
    onOpenMovieRef.current = onOpenMovie;
  }, [onOpenMovie]);
  const handleOpen = useCallback((movie: Movie) => {
    setHover(null);
    onOpenMovieRef.current(movie);
  }, []);

  // When a multi-film day is opened by keyboard, move focus into the tooltip so its film
  // buttons are reachable (Tab would otherwise land on the next cell and dismiss it).
  useEffect(() => {
    if (hover?.viaKeyboard) {
      cancelClose();
      tooltipRef.current?.querySelector('button')?.focus();
    }
  }, [hover, cancelClose]);

  // Clear the pending timer on unmount, and dismiss an open tooltip on scroll/resize
  // (its position is captured from a getBoundingClientRect and would otherwise go stale).
  useEffect(() => () => cancelClose(), [cancelClose]);
  useEffect(() => {
    if (!hover) return;
    const close = () => setHover(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [hover]);

  const cols = weeks.length;
  const gridWidth = LEFT_PAD + cols * STEP;
  const gridHeight = TOP_PAD + 7 * STEP;
  const maxMonthly = useMemo(() => Math.max(1, ...monthly.map(m => m.count)), [monthly]);

  return (
    <section aria-label="Viewing history" className="mb-10">
      {/* Summary stats */}
      <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8">
        <Stat icon={Clapperboard} value={total} label="In the last year" />
        <Stat icon={CalendarCheck} value={activeDays} label="Active days" />
        <Stat icon={Flame} value={currentStreak} label="Current streak" suffix="d" />
        <Stat icon={Trophy} value={longestStreak} label="Longest streak" suffix="d" />
        {busiestDay && (
          <Stat
            icon={Clapperboard}
            value={busiestDay.count}
            label={`Busiest · ${format(parseIso(busiestDay.date), 'MMM d')}`}
          />
        )}
      </div>

      {/* Heatmap grid */}
      <p className="sr-only">
        {total} films watched across {activeDays} days in the last year. Days with a film are
        listed below; activate one to open its film.
      </p>
      <div className="relative overflow-x-auto pb-2">
        <svg width={gridWidth} height={gridHeight} className="block">
          {/* Month labels */}
          {monthLabels.map(({ index, label }) => (
            <text
              key={`${label}-${index}`}
              x={LEFT_PAD + index * STEP}
              y={11}
              aria-hidden="true"
              className="fill-stone-500 dark:fill-stone-400"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Weekday labels */}
          {Object.entries(WEEKDAY_ROWS).map(([row, label]) => (
            <text
              key={label}
              x={0}
              y={TOP_PAD + Number(row) * STEP + CELL - 2}
              aria-hidden="true"
              className="fill-stone-500 dark:fill-stone-400"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Day cells. Only days with a film are focusable/announced; empty days are
              decorative so keyboard and screen-reader users step through active days only. */}
          {weeks.map((column, w) => (
            <g key={w}>
              {column.map((day, d) =>
                day ? (
                  <DayCell
                    key={day.date}
                    day={day}
                    w={w}
                    d={d}
                    isHovered={hover?.w === w && hover?.d === d}
                    onHover={openHover}
                    onLeave={scheduleClose}
                    onOpen={handleOpen}
                  />
                ) : null,
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip. Fixed positioning escapes the scroll container's overflow clipping
            (overflow-x-auto forces overflow-y to auto, which would clip an absolute child).
            Interactive so each film of a multi-film day is individually openable. */}
        {hover && (
          <div
            ref={tooltipRef}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                const cell = hover.cell;
                setHover(null);
                cell?.focus();
              }
            }}
            onBlur={e => {
              // Close once focus leaves the tooltip entirely (e.g. Tab past the last film).
              if (!tooltipRef.current?.contains(e.relatedTarget as Node | null)) setHover(null);
            }}
            className="fixed z-50 w-max max-w-[220px] rounded-lg border p-3 shadow-xl bg-white border-stone-200 text-stone-800 dark:bg-dark-card dark:border-white/10 dark:text-stone-100"
            style={{
              left: hover.rect.left + hover.rect.width / 2,
              // Flip above the cell when it sits in the lower part of the viewport, since any
              // scroll dismisses the tooltip and a cut-off one could not be scrolled into view.
              top:
                hover.rect.bottom > window.innerHeight * 0.6
                  ? hover.rect.top - 8
                  : hover.rect.bottom + 8,
              transform:
                hover.rect.bottom > window.innerHeight * 0.6
                  ? 'translate(-50%, -100%)'
                  : 'translateX(-50%)',
            }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              {fmtDay(hover.day.date)}
            </div>
            {hover.day.count === 0 ? (
              <div className="text-sm text-stone-400">No films</div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {hover.day.movies.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => handleOpen(m)}
                      className="flex items-center gap-2 w-full text-left rounded-sm hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    >
                      <img
                        src={m.cover_image}
                        alt=""
                        className="w-6 h-9 object-cover rounded-sm bg-stone-100 dark:bg-dark-surface shrink-0"
                      />
                      <span className="text-sm leading-tight line-clamp-2">{m.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 text-xs text-stone-500 dark:text-stone-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <span
            key={level}
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: `var(--act-${level})` }}
          />
        ))}
        <span>More</span>
      </div>

      {/* Monthly bars */}
      <div className="mt-10">
        <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
          Films per month
        </div>
        <div className="flex items-end gap-2 h-28">
          {monthly.map(m => (
            <div
              key={m.key}
              className="flex flex-1 flex-col items-center justify-end h-full min-w-0"
              title={`${m.count} in ${m.label}`}
            >
              <span className="text-[10px] text-stone-400 tabular-nums mb-1">{m.count || ''}</span>
              {/* shrink-0 keeps the bar at its true percentage height; without it the flex
                  column squeezes the tallest bar to fit the count label and skews the scale. */}
              <div
                className="w-full shrink-0 rounded-t bg-stone-300 dark:bg-stone-600"
                style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count ? 3 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-1.5">
          {monthly.map(m => (
            <span key={m.key} className="flex-1 text-center text-[10px] text-stone-500 dark:text-stone-400">
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

interface DayCellProps {
  day: ActivityDay;
  w: number;
  d: number;
  isHovered: boolean;
  onHover: (h: HoverState) => void;
  onLeave: () => void;
  onOpen: (movie: Movie) => void;
}

// Memoised so hovering (which re-renders the parent) only re-renders the two cells whose
// `isHovered` flips, not all ~371 rects. Relies on the parent passing stable callbacks.
const DayCell = React.memo<DayCellProps>(({ day, w, d, isHovered, onHover, onLeave, onOpen }) => {
  const interactive = day.count > 0;
  const single = day.count === 1;
  const titles = day.movies.map(m => m.title).join(', ');
  const label =
    `${day.count} ${single ? 'film' : 'films'} on ${fmtDay(day.date)}` +
    (titles ? `: ${titles}` : '') +
    (single ? ', open' : ', show films');
  // On touch there is no hover, so a tap fires onClick directly. Open a single-film day
  // straight away, but surface the tooltip for multi-film days so every film is reachable.
  const activate = (cell: SVGRectElement, viaKeyboard: boolean) => {
    if (single) onOpen(day.movies[0]);
    else onHover({ day, w, d, rect: cell.getBoundingClientRect(), viaKeyboard, cell });
  };
  return (
    <rect
      x={LEFT_PAD + w * STEP}
      y={TOP_PAD + d * STEP}
      width={CELL}
      height={CELL}
      rx={2}
      fill={`var(--act-${day.level})`}
      stroke={isHovered ? 'currentColor' : 'transparent'}
      strokeWidth={1}
      className={
        'text-stone-600 dark:text-stone-200 focus:outline-none' +
        (interactive ? ' cursor-pointer' : '')
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? label : undefined}
      onMouseEnter={e => onHover({ day, w, d, rect: e.currentTarget.getBoundingClientRect() })}
      onMouseLeave={onLeave}
      onFocus={interactive ? e => onHover({ day, w, d, rect: e.currentTarget.getBoundingClientRect() }) : undefined}
      onBlur={interactive ? onLeave : undefined}
      onKeyDown={
        interactive
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activate(e.currentTarget, true);
              }
            }
          : undefined
      }
      onClick={interactive ? e => activate(e.currentTarget, false) : undefined}
    />
  );
});
DayCell.displayName = 'DayCell';
