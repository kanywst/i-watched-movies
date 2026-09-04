import { describe, expect, it } from 'vitest';
import { computeScoringHabits, computeTasteProfile, recommendWatchlist } from './taste';
import { computeStats } from './stats';
import { countGenres } from './partition';
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
      rated,
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
      rated,
      profile,
      10,
    );
    expect(pick.predicted).toBe(profile.baseline);
    expect(pick.reasons).toEqual([]);
  });

  it('shrinks a thin genre toward the baseline', () => {
    const thinRated = [
      make({ id: 'a', tags: ['Crime'], point: 9 }),
      make({ id: 'b', tags: ['Comedy'], point: 3 }),
    ];
    const thin = computeTasteProfile(thinRated);
    const [pick] = recommendWatchlist(
      [make({ id: 'w1', published: false, tags: ['Crime'] })],
      thinRated,
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
      rated,
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
      rated,
      profile,
      10,
    );
    expect(pick.reasons.map(r => r.key)).toEqual(['Comedy', 'Korea']);
    expect(pick.reasons[0].contribution).toBeLessThan(0);
    expect(pick.reasons[1].contribution).toBeGreaterThan(0);
  });

  // A country whose overall average sits below the baseline can still be the best thing on
  // the list within one genre. Scoring the candidate against the flat country average charges
  // it for films it has nothing in common with.
  describe('country term', () => {
    // Japan averages 5.0 against a 6.0 baseline, but its crime entries are the top of the
    // diary and its comedies are the bottom.
    const mixed = [
      make({ id: 'j1', tags: ['Crime'], national: 'Japan', point: 9 }),
      make({ id: 'j2', tags: ['Crime'], national: 'Japan', point: 9 }),
      make({ id: 'j3', tags: ['Comedy'], national: 'Japan', point: 3 }),
      make({ id: 'j4', tags: ['Comedy'], national: 'Japan', point: 3 }),
      make({ id: 'j5', tags: ['Comedy'], national: 'Japan', point: 3 }),
      make({ id: 'j6', tags: ['Comedy'], national: 'Japan', point: 3 }),
      make({ id: 'u1', tags: ['Crime'], national: 'USA', point: 9 }),
      make({ id: 'u2', tags: ['Crime'], national: 'USA', point: 9 }),
    ];
    const mixedProfile = computeTasteProfile(mixed);
    const countryReason = (movie: Movie) => {
      const [pick] = recommendWatchlist([movie], mixed, mixedProfile, 10);
      return pick.reasons.find(r => r.key === 'Japan');
    };

    it('does not charge a film for its country when its genre is the strong one', () => {
      // The flat average is what the Stats panel shows, and it is negative.
      expect(mixedProfile.countries.find(c => c.key === 'Japan')!.delta).toBeLessThan(0);
      // The prediction must not inherit that: this film shares its tag with the good half.
      expect(
        countryReason(make({ id: 'w1', published: false, tags: ['Crime'], national: 'Japan' }))!
          .contribution,
      ).toBeGreaterThan(0);
    });

    it('still penalises a film whose genre is the weak half of the same country', () => {
      expect(
        countryReason(make({ id: 'w2', published: false, tags: ['Comedy'], national: 'Japan' }))!
          .contribution,
      ).toBeLessThan(0);
    });

    it('falls back to the whole country when no rated film shares a tag', () => {
      // No Japanese horror has been rated, so there is nothing better than the flat average.
      expect(
        countryReason(make({ id: 'w3', published: false, tags: ['Horror'], national: 'Japan' }))!
          .contribution,
      ).toBeLessThan(0);
    });

    it('ranks a genre-matched entry above the country average would', () => {
      const picks = recommendWatchlist(
        [
          make({ id: 'w1', published: false, title: 'JP Crime', tags: ['Crime'], national: 'Japan' }),
          make({ id: 'w2', published: false, title: 'US Crime', tags: ['Crime'], national: 'USA' }),
        ],
        mixed,
        mixedProfile,
        10,
      );
      // Both are crime; neither should be pushed below the other by nationality alone.
      expect(picks[0].predicted - picks[1].predicted).toBeLessThan(0.2);
    });
  });

  it('breaks ties by title and honours the limit', () => {
    const picks = recommendWatchlist(
      [
        make({ id: 'w1', published: false, title: 'Beta', tags: ['Crime'] }),
        make({ id: 'w2', published: false, title: 'Alpha', tags: ['Crime'] }),
        make({ id: 'w3', published: false, title: 'Gamma', tags: ['Comedy'] }),
      ],
      rated,
      profile,
      2,
    );
    expect(picks.map(p => p.movie.title)).toEqual(['Alpha', 'Beta']);
  });
});

/**
 * The Stats header row is built from `computeStats` and `countGenres` rather than from the
 * taste profile, so that App does not have to import taste.ts and the module can stay
 * behind the lazily-loaded TastePanel. That only holds while the three figures agree, so
 * pin the equivalence here: if `mean`, `buildAffinities` or `computeStats` ever diverge,
 * the header would silently start showing different numbers from the panel beneath it.
 */
describe('taste profile agrees with the cheap header counters', () => {
  const watched = [
    make({ id: 'a', point: 8, tags: ['Crime', 'Thriller'] }),
    make({ id: 'b', point: 6.5, tags: ['Crime'] }),
    make({ id: 'c', point: 4, tags: ['Horror', 'Thriller'] }),
    make({ id: 'd', point: 9, tags: [] }),
  ];

  it('total and baseline match computeStats', () => {
    const profile = computeTasteProfile(watched);
    const stats = computeStats(watched);
    expect(profile.total).toBe(stats.total);
    expect(profile.baseline).toBe(stats.averagePoint);
  });

  it('genre count matches countGenres', () => {
    expect(computeTasteProfile(watched).genres.length).toBe(countGenres(watched));
  });

  it('still agrees when there is nothing rated', () => {
    const profile = computeTasteProfile([]);
    expect(profile.total).toBe(computeStats([]).total);
    expect(profile.baseline).toBe(computeStats([]).averagePoint);
    expect(profile.genres.length).toBe(countGenres([]));
  });
});
