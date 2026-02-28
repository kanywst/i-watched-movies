# I Watched Movies

A sophisticated movie tracking SPA (Single Page Application) built with React + Vite + Tailwind CSS v4.

Simply write your movie logs in Markdown and push to GitHub. A beautiful, personalized movie log site will be automatically built and deployed.

## How to Add a Movie

Create a new `.md` file in the `movies/` directory using the following template:

```markdown
---
title: 'Movie Title'
published: true
tags:
  - 'Sci-Fi'
  - 'Action'
cover_image: 'https://example.com/image.jpg' # Any aspect ratio works!
release_date: '2025-01-01'
watch_date: '2026-01-12'
point: 9.5
summary: 'Write the movie summary here.'
impression: 'Write your passionate review here!'
---

You can also write free-form notes or a longer review here.
```

## Setup Guide

Follow these steps to host your own movie log.

1. **Clone or Use Template**
2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Customize Name**:
   Update the `USER_NAME` constant in `src/config.ts`.

   ```typescript
   export const CONFIG = {
     USER_NAME: "YourGitHubUsername", // This updates the title, header, and favicon automatically!
     // ...
   };
   ```

4. **Push to GitHub**:
   Pushing to the `main` branch triggers the GitHub Action to build and deploy.
5. **Enable GitHub Pages**:
   - Go to repository **Settings > Pages**.
   - Set **Source** to **Deploy from a branch**.
   - Set **Branch** to `gh-pages` (created automatically after the first Action run).

## Local Development & Checks

```bash
# Start dev server (auto-generates movies.json)
npm run dev

# Run full quality check (Lint + Security Audit)
npm run check

# Build for production
npm run build
```
