// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { cardSeasonScore, firstScoredSeason } from './seasons';
import { Movie, Season } from './types';

const season = (n: number, point: number | null): Season => ({
  season: n,
  point,
  status: 'watched',
  watch_date: null,
});

const movie = (seasons?: Season[]): Movie => ({
  id: 'm',
  title: 'Series',
  published: false,
  tags: [],
  cover_image: '',
  release_date: '',
  watch_date: '',
  point: 0,
  seasons,
  content: '',
});

describe('firstScoredSeason', () => {
  it('picks the lowest-numbered season, not the best or the newest', () => {
    expect(firstScoredSeason([season(1, 7.3), season(2, 9), season(3, 8)])?.season).toBe(1);
  });

  it('picks by season number rather than by position in the list', () => {
    expect(firstScoredSeason([season(3, 8), season(1, 7.3), season(2, 9)])?.season).toBe(1);
  });

  it('skips an unscored season instead of stopping at it', () => {
    const found = firstScoredSeason([season(1, null), season(2, 6.8)]);
    expect(found?.season).toBe(2);
    expect(found?.point).toBe(6.8);
  });

  it('keeps a 0 season score, which is a real score', () => {
    expect(firstScoredSeason([season(1, 0), season(2, 8)])?.point).toBe(0);
  });

  it('returns null when no season carries a score', () => {
    expect(firstScoredSeason([season(1, null), season(2, null)])).toBeNull();
  });

  it('returns null for an entry with no seasons at all', () => {
    expect(firstScoredSeason([])).toBeNull();
    expect(firstScoredSeason(undefined)).toBeNull();
  });
});

describe('cardSeasonScore', () => {
  it('yields the season score for an entry that has none of its own', () => {
    expect(cardSeasonScore(movie([season(1, 7.3)]), false)?.point).toBe(7.3);
  });

  it('yields nothing when the entry is rated, so one card prints one figure', () => {
    expect(cardSeasonScore(movie([season(1, 7.3)]), true)).toBeNull();
  });

  it('yields nothing for a film, which has no seasons', () => {
    expect(cardSeasonScore(movie(), false)).toBeNull();
  });
});
