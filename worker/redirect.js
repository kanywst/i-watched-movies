// The site moved to GitHub Pages on 2026-09-24. This Worker keeps the old workers.dev host
// alive as a permanent redirect so shared links and RSS subscriptions follow: the path and
// query string carry over, so `/?view=stats` and `/feed.xml` land on their Pages equivalent.
// Deployed by Cloudflare's GitHub integration, which still builds on push to main; nothing
// here needs a Cloudflare API token.
const TARGET = 'https://kanywst.github.io/i-watched-movies';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(`${TARGET}${url.pathname}${url.search}`, 301);
  },
};
