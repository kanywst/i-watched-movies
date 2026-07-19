import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Flame, Trophy, CalendarCheck, Clapperboard } from 'lucide-react';
import type { Movie } from '../types';
import type { ActivityDay, ActivitySummary } from '../activity';

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

const fmtDay = (iso: string) => format(new Date(iso + 'T00:00:00'), 'EEE, MMM d, yyyy');

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ summary, onOpenMovie }) => {
  const { weeks, monthLabels, total, activeDays, busiestDay, currentStreak, longestStreak, monthly } =
    summary;
  const [hover, setHover] = useState<
    { day: ActivityDay; w: number; d: number; rect: DOMRect } | null
  >(null);

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
            label={`Busiest · ${format(new Date(busiestDay.date + 'T00:00:00'), 'MMM d')}`}
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
          {weeks.map((column, w) =>
            column.map((day, d) => {
              if (!day) return null;
              const isHover = hover?.w === w && hover?.d === d;
              const interactive = day.count > 0;
              const label = `${day.count} ${day.count === 1 ? 'film' : 'films'} on ${fmtDay(day.date)}`;
              const focus = (e: React.FocusEvent<SVGRectElement>) =>
                setHover({ day, w, d, rect: e.currentTarget.getBoundingClientRect() });
              return (
                <rect
                  key={day.date}
                  x={LEFT_PAD + w * STEP}
                  y={TOP_PAD + d * STEP}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  fill={`var(--act-${day.level})`}
                  stroke={isHover ? 'currentColor' : 'transparent'}
                  strokeWidth={1}
                  className={
                    'text-stone-600 dark:text-stone-200 focus:outline-none' +
                    (interactive ? ' cursor-pointer' : '')
                  }
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  aria-hidden={interactive ? undefined : true}
                  aria-label={interactive ? `${label}, open` : undefined}
                  onMouseEnter={e => setHover({ day, w, d, rect: e.currentTarget.getBoundingClientRect() })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={interactive ? focus : undefined}
                  onBlur={interactive ? () => setHover(null) : undefined}
                  onKeyDown={
                    interactive
                      ? e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenMovie(day.movies[0]);
                          }
                        }
                      : undefined
                  }
                  onClick={interactive ? () => onOpenMovie(day.movies[0]) : undefined}
                />
              );
            }),
          )}
        </svg>

        {/* Tooltip. Fixed positioning escapes the scroll container's overflow clipping
            (overflow-x-auto forces overflow-y to auto, which would clip an absolute child). */}
        {hover && (
          <div
            className="pointer-events-none fixed z-50 w-max max-w-[220px] rounded-lg border p-3 shadow-xl bg-white border-stone-200 text-stone-800 dark:bg-dark-card dark:border-white/10 dark:text-stone-100"
            style={{
              left: hover.rect.left + hover.rect.width / 2,
              top: hover.rect.bottom + 8,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              {fmtDay(hover.day.date)}
            </div>
            {hover.day.count === 0 ? (
              <div className="text-sm text-stone-400">No films</div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {hover.day.movies.map(m => (
                  <li key={m.id} className="flex items-center gap-2">
                    <img
                      src={m.cover_image}
                      alt=""
                      className="w-6 h-9 object-cover rounded-sm bg-stone-100 dark:bg-dark-surface shrink-0"
                    />
                    <span className="text-sm leading-tight line-clamp-2">{m.title}</span>
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
              <div
                className="w-full rounded-t bg-stone-300 dark:bg-stone-600"
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

interface StatProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  suffix?: string;
}

const Stat: React.FC<StatProps> = ({ icon: Icon, value, label, suffix }) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
      <Icon className="w-4 h-4 text-stone-400" />
      <span className="text-2xl font-light tabular-nums">
        {value}
        {suffix && <span className="text-base text-stone-400">{suffix}</span>}
      </span>
    </div>
    <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
      {label}
    </div>
  </div>
);
