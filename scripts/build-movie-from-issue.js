import fs from 'fs';
import path from 'path';

const NO_RESPONSE = '_No response_';

export function parseIssueBody(body) {
  const sections = {};
  const text = String(body || '').replace(/\r\n/g, '\n');
  const parts = text.split(/\n###\s+/);
  for (let i = 0; i < parts.length; i++) {
    let chunk = parts[i];
    if (i === 0) {
      if (!chunk.startsWith('### ')) continue;
      chunk = chunk.slice(4);
    }
    const nl = chunk.indexOf('\n');
    if (nl === -1) continue;
    const label = chunk.slice(0, nl).trim();
    const value = chunk.slice(nl + 1).trim();
    sections[label] = value === NO_RESPONSE ? '' : value;
  }
  return sections;
}

export function slugify(input, fallback) {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['"`’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || fallback;
}

function parseTags(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parsePoint(raw) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw) {
  if (!raw) return '';
  const m = String(raw).trim().match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

export function buildMovie(sections, { issueNumber } = {}) {
  const list = (sections['List'] || 'Watched').trim();
  const published = list.toLowerCase() !== 'watchlist';

  const movie = {
    title: (sections['Title'] || '').trim(),
    published,
    tags: parseTags(sections['Tags']),
    national: (sections['National'] || '').trim(),
    cover_image: (sections['Cover image URL'] || '').trim(),
    release_date: parseDate(sections['Release date']),
    watch_date: parseDate(sections['Watch date']),
    point: parsePoint(sections['Point']),
    summary: (sections['Summary'] || '').trim(),
    impression: (sections['Impression'] || '').trim(),
    body: (sections['Body'] || '').trim(),
  };

  if (!movie.title) {
    throw new Error('Title is required.');
  }

  const slug = slugify(movie.title, issueNumber ? `movie-${issueNumber}` : 'movie');
  return { movie, slug };
}

function quote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

export function formatFile(movie) {
  const lines = ['---'];
  lines.push(`title: ${quote(movie.title)}`);
  lines.push(`published: ${movie.published}`);
  if (movie.tags.length) {
    lines.push('tags:');
    for (const t of movie.tags) lines.push(`  - ${quote(t)}`);
  }
  if (movie.national) lines.push(`national: ${quote(movie.national)}`);
  if (movie.cover_image) lines.push(`cover_image: ${quote(movie.cover_image)}`);
  if (movie.release_date) lines.push(`release_date: ${quote(movie.release_date)}`);
  if (movie.watch_date) lines.push(`watch_date: ${quote(movie.watch_date)}`);
  if (movie.point !== null) lines.push(`point: ${movie.point}`);
  if (movie.summary) lines.push(`summary: ${quote(movie.summary)}`);
  if (movie.impression) lines.push(`impression: ${quote(movie.impression)}`);
  lines.push('---');
  lines.push('');
  if (movie.body) {
    lines.push(movie.body);
    lines.push('');
  }
  return lines.join('\n');
}

function emit(name, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}

function main() {
  const body = process.env.ISSUE_BODY;
  const issueNumber = process.env.ISSUE_NUMBER;
  if (!body) throw new Error('ISSUE_BODY env is required.');

  const sections = parseIssueBody(body);
  const { movie, slug } = buildMovie(sections, { issueNumber });
  const outPath = path.join('movies', `${slug}.md`);

  if (fs.existsSync(outPath)) {
    throw new Error(`movies/${slug}.md already exists. Pick a different title or delete the existing file.`);
  }

  fs.writeFileSync(outPath, formatFile(movie));

  emit('slug', slug);
  emit('path', outPath);
  emit('title', movie.title);
  emit('list', movie.published ? 'Watched' : 'Watchlist');
  emit('watchlist', movie.published ? 'false' : 'true');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
