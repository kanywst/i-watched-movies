import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

const MOVIES_DIR = path.join(process.cwd(), 'movies');
const OUTPUT_FILE = path.join(process.cwd(), 'src/data/movies.json');

async function generate() {
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all markdown files
  const files = await glob('*.md', { cwd: MOVIES_DIR });
  
  const movies = files.map((file) => {
    const filePath = path.join(MOVIES_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Only include published movies
    if (data.published === false) return null;

    return {
      id: file.replace(/\.md$/, ''),
      title: data.title || 'Untitled',
      published: data.published ?? true,
      tags: data.tags || [],
      national: data.national || null,
      cover_image: data.cover_image || '',
      release_date: data.release_date ? new Date(data.release_date).toISOString() : null,
      watch_date: data.watch_date ? new Date(data.watch_date).toISOString() : null,
      point: data.point || 0,
      summary: data.summary || '',
      impression: data.impression || '',
      content: content,
    };
  }).filter(Boolean);

  // Sort by watch_date descending by default
  movies.sort((a, b) => {
    const dateA = a.watch_date ? new Date(a.watch_date).getTime() : 0;
    const dateB = b.watch_date ? new Date(b.watch_date).getTime() : 0;
    return dateB - dateA;
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(movies, null, 2));
  console.log(`Generated ${movies.length} movies in ${OUTPUT_FILE}`);
}

generate().catch(console.error);
