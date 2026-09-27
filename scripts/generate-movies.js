import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parseMovie, compareByWatchDateDesc } from './parse-movie.js';
import { buildJsonLd, buildRssFeed, entryPagePath } from './build-feeds.js';
import { buildMoviePage, buildSitemap } from './build-pages.js';

const MOVIES_DIR = path.join(process.cwd(), 'movies');
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/movies.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const JSONLD_FILE = path.join(PUBLIC_DIR, 'collection.jsonld');
const RSS_FILE = path.join(PUBLIC_DIR, 'feed.xml');
const SITEMAP_FILE = path.join(PUBLIC_DIR, 'sitemap.xml');
const PAGES_DIR = path.join(PUBLIC_DIR, 'm');

async function generate() {
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const files = await glob('*.md', { cwd: MOVIES_DIR });

  const movies = files
    .map((file) => {
      const fileContent = fs.readFileSync(path.join(MOVIES_DIR, file), 'utf-8');
      return parseMovie(fileContent, file.replace(/\.md$/, ''));
    })
    .filter(Boolean);

  movies.sort(compareByWatchDateDesc);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(movies, null, 2));
  fs.writeFileSync(JSONLD_FILE, JSON.stringify(buildJsonLd(movies), null, 2));
  fs.writeFileSync(RSS_FILE, buildRssFeed(movies));
  fs.writeFileSync(SITEMAP_FILE, buildSitemap(movies));

  // Cleared first so an entry that was deleted or renamed does not leave its page behind.
  fs.rmSync(PAGES_DIR, { recursive: true, force: true });
  for (const movie of movies) {
    const dir = path.join(PUBLIC_DIR, entryPagePath(movie.id));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), buildMoviePage(movie));
  }

  console.log(`Generated ${movies.length} movies in ${OUTPUT_FILE}`);
  console.log(`Wrote ${JSONLD_FILE}, ${RSS_FILE}, ${SITEMAP_FILE} and ${movies.length} pages under ${PAGES_DIR}`);
}

// A failure must fail the build: `npm run build` chains straight into tsc and vite, which
// would otherwise ship whatever stale artifacts the last good run left in public/.
generate().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
