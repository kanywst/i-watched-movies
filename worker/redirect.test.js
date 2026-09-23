// @vitest-environment node
import { describe, expect, it } from 'vitest';
import worker from './redirect.js';

const OLD = 'https://i-watched-movies.edgebox12.workers.dev';
const NEW = 'https://kanywst.github.io/i-watched-movies';

const follow = (path) => {
  const res = worker.fetch(new Request(`${OLD}${path}`));
  return { status: res.status, location: res.headers.get('location') };
};

describe('workers.dev redirect', () => {
  it('sends the root to the Pages root with a permanent redirect', () => {
    expect(follow('/')).toEqual({ status: 301, location: `${NEW}/` });
  });

  it('carries the query string, so shared view and modal links survive', () => {
    expect(follow('/?view=stats&selected=yadang')).toEqual({
      status: 301,
      location: `${NEW}/?view=stats&selected=yadang`,
    });
  });

  it('carries the path, so feed subscriptions follow', () => {
    expect(follow('/feed.xml')).toEqual({ status: 301, location: `${NEW}/feed.xml` });
  });
});
