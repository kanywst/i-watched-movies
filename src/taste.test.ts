import { describe, expect, it } from 'vitest';
import { computeScoringHabits, computeTasteProfile, recommendWatchlist } from './taste';
import type { Movie } from './types';

const make = (overrides: Partial<Movie>): Movie => ({
  id: 'x',
  title: 'X',
  published: true,
  tags: [],
  cover_image: '',
  release_date: '2025-01-01',
  watch_date: '2025-01-01',
  point: 5,
  content: '',
  ...overrides,
});

describe('computeTasteProfile', () => {
  it('returns an empty profile for an empty list', () => {
    const profile = computeTasteProfile([]);
    expect(profile).toMatchObject({
      total: 0,
      baseline: 0,
      median: 0,
      spread: 0,
      genres: [],
      countries: [],
      eras: [],
      medianLagDays: null,
      newReleaseShare: 0,
    });
  });

  it('computes baseline, median and spread', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', point: 8 }),
      make({ id: 'b', point: 6 }),
      make({ id: 'c', point: 4 }),
    ]);
    expect(profile.baseline).toBe(6);
    expect(profile.median).toBe(6);
    expect(profile.spread).toBeCloseTo(1.633, 3);
  });

  it('averages the two middle scores for an even count', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', point: 4 }),
      make({ id: 'b', point: 7 }),
      make({ id: 'c', point: 8 }),
      make({ id: 'd', point: 9 }),
    ]);
    expect(profile.median).toBe(7.5);
  });

  it('scores each genre against the baseline, sample size first', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', tags: ['Crime', 'Thriller'], point: 9 }),
      make({ id: 'b', tags: ['Crime'], point: 7 }),
      make({ id: 'c', tags: ['Comedy'], point: 2 }),
    ]);
    expect(profile.baseline).toBe(6);
    expect(profile.genres.map(g => g.key)).toEqual(['Crime', 'Comedy', 'Thriller']);
    expect(profile.genres[0]).toMatchObject({ key: 'Crime', count: 2, average: 8, delta: 2 });
    expect(profile.genres[1]).toMatchObject({ key: 'Comedy', count: 1, average: 2, delta: -4 });
  });

  it('skips movies with no national when grouping countries', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', national: 'Japan', point: 8 }),
      make({ id: 'b', national: 'Japan', point: 6 }),
      make({ id: 'c', point: 4 }),
    ]);
    expect(profile.countries).toHaveLength(1);
    expect(profile.countries[0]).toMatchObject({ key: 'Japan', count: 2, average: 7 });
  });

  it('buckets release dates into decades and ignores missing ones', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', release_date: '2003-05-01' }),
      make({ id: 'b', release_date: '2025-01-01' }),
      make({ id: 'c', release_date: '2026-01-01' }),
      make({ id: 'd', release_date: '' }),
    ]);
    expect(profile.eras.map(e => [e.key, e.count])).toEqual([
      ['2020s', 2],
      ['2000s', 1],
    ]);
  });

  it('measures the lag from release to watch, counting previews as on release', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', release_date: '2025-01-01', watch_date: '2025-01-11' }),
      make({ id: 'b', release_date: '2025-01-01', watch_date: '2025-03-02' }),
      make({ id: 'c', release_date: '2025-01-01', watch_date: '2026-01-01' }),
      make({ id: 'd', release_date: '2025-06-01', watch_date: '2025-05-30' }),
    ]);
    expect(profile.medianLagDays).toBe(35);
    expect(profile.newReleaseShare).toBe(0.75);
  });

  it('ignores movies missing either date when measuring the lag', () => {
    const profile = computeTasteProfile([
      make({ id: 'a', release_date: '2025-01-01', watch_date: '' }),
      make({ id: 'b', release_date: '', watch_date: '2025-01-01' }),
    ]);
    expect(profile.medianLagDays).toBeNull();
    expect(profile.newReleaseShare).toBe(0);
  });
});

describe('computeScoringHabits', () => {
  const rate = (points: number[], tags: string[][] = []) =>
    points.map((point, i) => make({ id: `m${i}`, point, tags: tags[i] ?? [] }));

  it('drops every score into a half-point bucket', () => {
    const movies = rate([0, 7.4, 7.5, 10]);
    const habits = computeScoringHabits(movies, computeTasteProfile(movies));
    const filled = habits.buckets.filter(b => b.count > 0);
    // 10 has no bucket of its own, so it shares the top 9.5-10 band.
    expect(filled).toEqual([
      { start: 0, count: 1 },
      { start: 7, count: 1 },
      { start: 7.5, count: 1 },
      { start: 9.5, count: 1 },
    ]);
    expect(habits.peak).toEqual({ start: 0, count: 1 });
  });

  it('reports the extremes and how tightly scores cluster', () => {
    const movies = rate([8, 8, 8, 8, 8, 8, 8, 8, 8, 3]);
    const habits = computeScoringHabits(movies, computeTasteProfile(movies));
    expect(habits.lowest?.point).toBe(3);
    expect(habits.highest?.point).toBe(8);
    // baseline 7.5, so every 8 sits within half a point of it and only the 3 does not.
    expect(habits.concentration).toBe(0.9);
  });

  it('needs two genres with a real sample before naming a generous one', () => {
    const single = rate([9, 7], [['Crime'], ['Crime']]);
    const singleHabits = computeScoringHabits(single, computeTasteProfile(single));
    expect(singleHabits.mostGenerous).toBeNull();
    expect(singleHabits.harshest).toBeNull();

    const movies = rate([9, 9, 4, 4, 8], [['Crime'], ['Crime'], ['Comedy'], ['Comedy'], ['Anime']]);
    const habits = computeScoringHabits(movies, computeTasteProfile(movies));
    expect(habits.mostGenerous?.key).toBe('Crime');
    // Anime has a single film, so it cannot take the harshest slot from Comedy.
    expect(habits.harshest?.key).toBe('Comedy');
  });

  it('flags ratings two standard deviations off the mean, furthest first', () => {
    const movies = rate([8, 8, 8, 8, 8, 8, 8, 8, 1]);
    const habits = computeScoringHabits(movies, computeTasteProfile(movies));
    expect(habits.outliers.map(m => m.point)).toEqual([1]);
  });

  it('has no outliers when every rating is identical', () => {
    const movies = rate([8, 8, 8]);
    const habits = computeScoringHabits(movies, computeTasteProfile(movies));
    expect(habits.outliers).toEqual([]);
  });

  it('compares the older half of the diary against the newer half', () => {
    const movies = [
      make({ id: 'a', watch_date: '2025-01-01', point: 6 }),
      make({ id: 'b', watch_date: '2025-02-01', point: 6 }),
      make({ id: 'c', watch_date: '2025-03-01', point: 6 }),
      make({ id: 'd', watch_date: '2025-04-01', point: 8 }),
      make({ id: 'e', watch_date: '2025-05-01', point: 8 }),
      make({ id: 'f', watch_date: '2025-06-01', point: 8 }),
    ];
    // Fed in reverse to prove the split is chronological, not list order.
    const habits = computeScoringHabits([...movies].reverse(), computeTasteProfile(movies));
    expect(habits.drift).toEqual({ earlier: 6, later: 8, delta: 2 });
  });

  it('skips the drift comparison below the minimum sample', () => {
    const movies = rate([6, 7, 8]);
    expect(computeScoringHabits(movies, computeTasteProfile(movies)).drift).toBeNull();
  });
});

describe('recommendWatchlist', () => {
  const rated = [
    make({ id: 'r1', tags: ['Crime'], national: 'Korea', point: 9 }),
    make({ id: 'r2', tags: ['Crime'], national: 'Korea', point: 9 }),
    make({ id: 'r3', tags: ['Crime'], national: 'Korea', point: 9 }),
    make({ id: 'r4', tags: ['Comedy'], national: 'USA', point: 3 }),
    make({ id: 'r5', tags: ['Comedy'], national: 'USA', point: 3 }),
    make({ id: 'r6', tags: ['Comedy'], national: 'USA', point: 3 }),
  ];
  const profile = computeTasteProfile(rated);

  it('ranks the matching genre above the mismatched one', () => {
    const picks = recommendWatchlist(
      [
        make({ id: 'w1', published: false, title: 'Comic', tags: ['Comedy'], national: 'USA' }),
        make({ id: 'w2', published: false, title: 'Heist', tags: ['Crime'], national: 'Korea' }),
      ],
      profile,
      10,
    );
    expect(picks.map(p => p.movie.id)).toEqual(['w2', 'w1']);
    expect(picks[0].predicted).toBeGreaterThan(profile.baseline);
    expect(picks[1].predicted).toBeLessThan(profile.baseline);
  });

  it('leaves an entry with no known genre or country on the baseline', () => {
    const [pick] = recommendWatchlist(
      [make({ id: 'w1', published: false, tags: ['Western'], national: 'France' })],
      profile,
      10,
    );
    expect(pick.predicted).toBe(profile.baseline);
    expect(pick.reasons).toEqual([]);
  });

  it('shrinks a thin genre toward the baseline', () => {
    const thin = computeTasteProfile([
      make({ id: 'a', tags: ['Crime'], point: 9 }),
      make({ id: 'b', tags: ['Comedy'], point: 3 }),
    ]);
    const [pick] = recommendWatchlist(
      [make({ id: 'w1', published: false, tags: ['Crime'] })],
      thin,
      10,
    );
    // Crime measures +3 on one film, so a prior of 3 lets only a quarter of it through.
    expect(pick.predicted).toBeCloseTo(6.75, 5);
  });

  it('averages the genre pull instead of summing it', () => {
    const picks = recommendWatchlist(
      [
        make({ id: 'w1', published: false, title: 'One', tags: ['Crime'] }),
        make({ id: 'w2', published: false, title: 'Two', tags: ['Crime', 'Comedy'] }),
      ],
      profile,
      10,
    );
    const one = picks.find(p => p.movie.id === 'w1')!;
    const two = picks.find(p => p.movie.id === 'w2')!;
    expect(one.predicted).toBeGreaterThan(two.predicted);
    expect(two.predicted).toBe(profile.baseline);
  });

  it('keeps the strongest pull first whichever way it points', () => {
    const [pick] = recommendWatchlist(
      [make({ id: 'w1', published: false, tags: ['Comedy'], national: 'Korea' })],
      profile,
      10,
    );
    expect(pick.reasons.map(r => r.key)).toEqual(['Comedy', 'Korea']);
    expect(pick.reasons[0].contribution).toBeLessThan(0);
    expect(pick.reasons[1].contribution).toBeGreaterThan(0);
  });

  it('breaks ties by title and honours the limit', () => {
    const picks = recommendWatchlist(
      [
        make({ id: 'w1', published: false, title: 'Beta', tags: ['Crime'] }),
        make({ id: 'w2', published: false, title: 'Alpha', tags: ['Crime'] }),
        make({ id: 'w3', published: false, title: 'Gamma', tags: ['Comedy'] }),
      ],
      profile,
      2,
    );
    expect(picks.map(p => p.movie.title)).toEqual(['Alpha', 'Beta']);
  });
});
