import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { parseMovie, compareByWatchDateDesc } from './parse-movie.js';
import { buildJsonLd, buildRssFeed } from './build-feeds.js';

const MOVIES_DIR = path.join(process.cwd(), 'movies');
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/movies.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const JSONLD_FILE = path.join(PUBLIC_DIR, 'collection.jsonld');
const RSS_FILE = path.join(PUBLIC_DIR, 'feed.xml');

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

  console.log(`Generated ${movies.length} movies in ${OUTPUT_FILE}`);
  console.log(`Wrote ${JSONLD_FILE} and ${RSS_FILE}`);
}

generate().catch(console.error);
