import React, { useMemo } from 'react';
import { Compass, Gauge, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import type { Movie } from '../types';
import { Stat } from './ui/Stat';
import type { Affinity, ScoringHabits } from '../taste';
import { computeScoringHabits, computeTasteProfile, recommendWatchlist } from '../taste';
import {
  COUNTRY_FLAGS,
  MIN_AFFINITY_SAMPLE,
  RECOMMENDATION_LIMIT,
  SCORE_BUCKET_STEP,
} from '../constants';

/**
 * The analysis is derived here rather than handed down as props so that `taste.ts` is
 * reachable only through this component. This panel is loaded lazily (App.tsx), so keeping
 * the 300-odd lines of affinity maths on this side of the boundary takes them out of the
 * entry chunk for the four views that never open Stats.
 */
interface TastePanelProps {
  /** The rated films. Must be the same list the header counters are built from. */
  watched: Movie[];
  watchlist: Movie[];
  onOpenMovie: (movie: Movie) => void;
}

// Genres run long in the tail; past this the list is single-film noise the affinity
// sections already dim out.
const GENRE_ROWS = 10;

const fmt = (n: number) => n.toFixed(1);
const signed = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(1)}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

export const TastePanel: React.FC<TastePanelProps> = ({ watched, watchlist, onOpenMovie }) => {
  const profile = useMemo(() => computeTasteProfile(watched), [watched]);
  // Both of these are documented as requiring the profile built from the same list, which
  // is why they are derived together here rather than by separate callers.
  const habits = useMemo(() => computeScoringHabits(watched, profile), [watched, profile]);
  const recommendations = useMemo(
    () => recommendWatchlist(watchlist, watched, profile, RECOMMENDATION_LIMIT),
    [watchlist, watched, profile],
  );

  if (profile.total === 0) {
    return (
      <div className="py-32 text-center text-stone-500">
        <p className="text-lg">Nothing rated yet, so there is no taste to read.</p>
      </div>
    );
  }

  const topGenre = profile.genres[0] ?? null;
  const lift = [...profile.genres]
    .filter(a => a.count >= MIN_AFFINITY_SAMPLE)
    .sort((a, b) => b.delta - a.delta)[0] ?? null;

  return (
    <div className="flex flex-col gap-16 mb-10">
      <Section
        icon={Compass}
        title="Taste profile"
        note={`Every delta is measured against the ${fmt(profile.baseline)} average.`}
      >
        <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8">
          {topGenre && (
            <Stat value={topGenre.key} label={`Most watched · ${topGenre.count} films`} />
          )}
          {lift && <Stat value={signed(lift.delta)} label={`Rated highest · ${lift.key}`} />}
          {/* Both read the same release-to-watch gaps, so neither means anything when no
              film carries both dates. */}
          {profile.medianLagDays !== null && (
            <>
              <Stat
                value={formatLag(profile.medianLagDays)}
                label="Median wait after release"
              />
              <Stat value={pct(profile.newReleaseShare)} label="Caught on release" />
            </>
          )}
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          <AffinityList
            title="Genres"
            items={profile.genres.slice(0, GENRE_ROWS)}
            baseline={profile.baseline}
          />
          <div className="flex flex-col gap-10">
            <AffinityList
              title="Countries"
              items={profile.countries}
              baseline={profile.baseline}
              flags
            />
            <AffinityList title="Eras" items={profile.eras} baseline={profile.baseline} />
          </div>
        </div>
      </Section>

      <Section
        icon={Gauge}
        title="Scoring habits"
        note={`How the 0-10 scale actually gets used across ${profile.total} rated films.`}
      >
        <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8">
          <Stat value={fmt(profile.median)} label="Median score" />
          <Stat value={fmt(profile.spread)} label="Spread (σ)" />
          <Stat
            value={pct(habits.concentration)}
            label={`Within ±${SCORE_BUCKET_STEP} of average`}
          />
          {habits.drift && (
            <Stat
              value={signed(habits.drift.delta)}
              label="Recent half vs older half"
              icon={habits.drift.delta >= 0 ? TrendingUp : TrendingDown}
            />
          )}
        </div>

        <Histogram habits={habits} baseline={profile.baseline} />

        <div className="grid gap-8 md:grid-cols-2 mt-10">
          <div className="flex flex-col gap-3">
            <Label>Soft spots and blind spots</Label>
            {habits.mostGenerous && habits.harshest ? (
              <ul className="flex flex-col gap-2 text-sm text-stone-600 dark:text-stone-300">
                <li>
                  Most generous with <Strong>{habits.mostGenerous.key}</Strong> at{' '}
                  <span className="tabular-nums">{fmt(habits.mostGenerous.average)}</span>,{' '}
                  {signed(habits.mostGenerous.delta)} on the average.
                </li>
                <li>
                  Hardest on <Strong>{habits.harshest.key}</Strong> at{' '}
                  <span className="tabular-nums">{fmt(habits.harshest.average)}</span>,{' '}
                  {signed(habits.harshest.delta)}.
                </li>
                {habits.highest && habits.lowest && (
                  <li>
                    Range runs from <Strong>{habits.lowest.title}</Strong> (
                    <span className="tabular-nums">{habits.lowest.point}</span>) to{' '}
                    <Strong>{habits.highest.title}</Strong> (
                    <span className="tabular-nums">{habits.highest.point}</span>).
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">
                Not enough genres with more than one film to compare yet.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>Outliers</Label>
            {habits.outliers.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {habits.outliers.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onOpenMovie(m)}
                      className="flex items-baseline gap-3 w-full text-left text-sm rounded-sm hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                    >
                      <span className="tabular-nums text-stone-500 w-8 shrink-0">{m.point}</span>
                      <span className="text-stone-700 dark:text-stone-200 truncate">{m.title}</span>
                      <span className="ml-auto shrink-0 text-xs text-stone-400 tabular-nums">
                        {signed(m.point - profile.baseline)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">
                No rating sits far enough from the average to stand out.
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section
        icon={Sparkles}
        title="What to watch next"
        note="Watchlist entries ranked by the score this profile predicts, not by quality."
      >
        {recommendations.length > 0 ? (
          <ol className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {recommendations.map((rec, index) => (
              <li key={rec.movie.id}>
                <button
                  type="button"
                  onClick={() => onOpenMovie(rec.movie)}
                  className="flex items-center gap-4 w-full text-left p-2 -m-2 rounded-lg transition-colors hover:bg-stone-100 dark:hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  <span className="w-5 shrink-0 text-sm tabular-nums text-stone-400">
                    {index + 1}
                  </span>
                  <img
                    src={rec.movie.cover_image}
                    alt=""
                    loading="lazy"
                    className="w-10 h-14 object-cover rounded-sm bg-stone-100 dark:bg-dark-surface shrink-0"
                  />
                  <span className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-sm font-medium leading-tight text-stone-800 dark:text-stone-200 line-clamp-1">
                      {rec.movie.title}
                    </span>
                    <span className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wider text-stone-500">
                      {rec.reasons.length > 0 ? (
                        rec.reasons.map(r => (
                          <span key={r.key} className="whitespace-nowrap">
                            {r.key} {signed(r.contribution)}
                          </span>
                        ))
                      ) : (
                        <span>No rated genre to go on</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-light tabular-nums text-stone-800 dark:text-stone-200">
                      {fmt(rec.predicted)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-stone-400">
                      Predicted
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-stone-500">Nothing on the watchlist to rank.</p>
        )}
      </Section>
    </div>
  );
};

function formatLag(days: number): string {
  if (Math.abs(days) < 60) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon: Icon, title, note, children }) => (
  <section aria-label={title}>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-stone-400" />
      <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-stone-700 dark:text-stone-300">
        {title}
      </h2>
    </div>
    <p className="text-xs text-stone-500 mb-8">{note}</p>
    {children}
  </section>
);

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
    {children}
  </div>
);

const Strong: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-stone-800 dark:text-stone-100">{children}</span>
);


interface AffinityListProps {
  title: string;
  items: Affinity[];
  baseline: number;
  flags?: boolean;
}

const AffinityList: React.FC<AffinityListProps> = ({ title, items, baseline, flags }) => {
  // Scale the bars to the widest delta on show, so a diary with narrow deltas still reads.
  const maxDelta = Math.max(...items.map(a => Math.abs(a.delta)), 0.1);

  return (
    <div className="flex flex-col gap-3">
      <Label>{title}</Label>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">Nothing tagged yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(item => {
            const thin = item.count < MIN_AFFINITY_SAMPLE;
            const width = (Math.abs(item.delta) / maxDelta) * 50;
            return (
              <li
                key={item.key}
                className={clsx('flex items-center gap-3 text-sm', thin && 'opacity-45')}
                title={
                  thin
                    ? `${item.key}: one film only, so the average says little`
                    : `${item.key}: ${item.count} films, average ${fmt(item.average)} against a baseline of ${fmt(baseline)}`
                }
              >
                <span className="flex-1 min-w-0 truncate text-stone-700 dark:text-stone-200">
                  {flags && item.key in COUNTRY_FLAGS && (
                    <span className="mr-1.5">{COUNTRY_FLAGS[item.key]}</span>
                  )}
                  {item.key}
                </span>
                <span className="w-6 text-right text-xs tabular-nums text-stone-400">
                  {item.count}
                </span>
                <span className="w-8 text-right text-xs tabular-nums text-stone-500">
                  {fmt(item.average)}
                </span>
                {/* Diverging bar: the centre line is the personal average, so the direction
                    of the bar is the whole point and its length is the size of the gap. */}
                <span className="relative w-20 sm:w-24 h-1.5 shrink-0" aria-hidden="true">
                  <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stone-300 dark:bg-white/15" />
                  <span
                    className={clsx(
                      'absolute inset-y-0 rounded-sm',
                      item.delta >= 0
                        ? 'left-1/2 bg-emerald-500/70 dark:bg-emerald-400/60'
                        : 'right-1/2 bg-rose-500/70 dark:bg-rose-400/60',
                    )}
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className="w-10 text-right text-xs tabular-nums text-stone-500">
                  {signed(item.delta)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface HistogramProps {
  habits: ScoringHabits;
  baseline: number;
}

const Histogram: React.FC<HistogramProps> = ({ habits, baseline }) => {
  const max = Math.max(1, ...habits.buckets.map(b => b.count));

  return (
    <div>
      <Label>Score distribution</Label>
      <div className="flex items-end gap-1 h-28 mt-3">
        {habits.buckets.map(bucket => {
          const holdsBaseline =
            baseline >= bucket.start && baseline < bucket.start + SCORE_BUCKET_STEP;
          return (
            <div
              key={bucket.start}
              className="flex flex-1 flex-col items-center justify-end h-full min-w-0"
              title={`${bucket.count} rated ${bucket.start} to ${bucket.start + SCORE_BUCKET_STEP}`}
            >
              <span className="text-[10px] text-stone-400 tabular-nums mb-1">
                {bucket.count || ''}
              </span>
              {/* shrink-0 keeps the bar at its true percentage height, matching the
                  monthly bars in the history view. */}
              <div
                className={clsx(
                  'w-full shrink-0 rounded-t',
                  holdsBaseline
                    ? 'bg-stone-500 dark:bg-stone-300'
                    : 'bg-stone-300 dark:bg-stone-600',
                )}
                style={{
                  height: `${(bucket.count / max) * 100}%`,
                  minHeight: bucket.count ? 3 : 0,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5">
        {habits.buckets.map(bucket => (
          <span
            key={bucket.start}
            className="flex-1 text-center text-[10px] text-stone-500 dark:text-stone-400 tabular-nums"
          >
            {Number.isInteger(bucket.start) ? bucket.start : ''}
          </span>
        ))}
      </div>
      <p className="sr-only">
        {habits.buckets
          .filter(b => b.count > 0)
          .map(b => `${b.count} films rated ${b.start} to ${b.start + SCORE_BUCKET_STEP}`)
          .join(', ')}
        .
      </p>
    </div>
  );
};
