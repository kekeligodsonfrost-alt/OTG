import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { games, categories } from './js/games/registry.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(root, 'dist');
const files = [
  'index.html',
  'ads.txt',
  'styles.css',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
  'assets',
  'js',
];
const pageTitle = 'One Second Games | Free Quick Browser Mini-Games';
const pageDescription = `Play ${games.length} free browser mini-games: reflex tests, memory and math challenges, visual puzzles, and quick arcade games. No account or download required.`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const escapeJsonForHtml = value => JSON.stringify(value).replace(/</g, '\\u003c');
const configuredSiteUrl = process.env.PUBLIC_SITE_URL || 'https://one-second-games.netlify.app';
let siteUrl = '';
if (configuredSiteUrl) {
  const parsed = new URL(configuredSiteUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('PUBLIC_SITE_URL/URL must be an absolute HTTP(S) URL.');
  siteUrl = parsed.origin;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  await cp(resolve(root, file), resolve(output, file), { recursive: true });
}

const gameList = categories.filter(category => category !== 'All').map(category => {
  const entries = games.filter(game => game.category === category).map(game => `<li><a href="/games/${escapeHtml(game.id)}/">${escapeHtml(game.title)}</a> — ${escapeHtml(game.description)}</li>`).join('');
  return `<section><h3>${escapeHtml(category)} games</h3><ul>${entries}</ul></section>`;
}).join('');
const gameListTarget = '<div id="seo-game-list"></div>';
const outputIndex = resolve(output, 'index.html');
let html = await readFile(outputIndex, 'utf8');
if (!html.includes(gameListTarget)) throw new Error('Could not find the SEO game-list target in index.html.');
html = html.replace(gameListTarget, `<div id="seo-game-list">${gameList}</div>`);

const originMetadata = siteUrl ? [
  `<link rel="canonical" href="${siteUrl}/">`,
  `<meta property="og:url" content="${siteUrl}/">`,
  `<meta property="og:image" content="${siteUrl}/assets/social-card.png">`,
  '<meta property="og:image:type" content="image/png">',
  '<meta property="og:image:width" content="1200">',
  '<meta property="og:image:height" content="630">',
  '<meta property="og:image:alt" content="One Second Games: free browser mini-games for reflexes, memory, math, and arcade play">',
  `<meta name="twitter:image" content="${siteUrl}/assets/social-card.png">`,
  '<meta name="twitter:image:alt" content="One Second Games: free browser mini-games for reflexes, memory, math, and arcade play">',
].join('\n  ') : '';
const website = {
  '@type': 'WebSite',
  name: 'One Second Games',
  description: pageDescription,
  inLanguage: 'en',
  ...(siteUrl ? { '@id': `${siteUrl}/#website`, url: `${siteUrl}/` } : {}),
};
const itemList = {
  '@type': 'ItemList',
  name: 'Free browser mini-games',
  numberOfItems: games.length,
  itemListElement: games.map((game, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'VideoGame',
      name: game.title,
      description: game.description,
      genre: game.category,
      gamePlatform: 'Web browser',
      playMode: 'SinglePlayer',
    },
  })),
};
const structuredData = `<script type="application/ld+json">${escapeJsonForHtml({
  '@context': 'https://schema.org',
  '@graph': [
    website,
    { ...itemList, ...(siteUrl ? { '@id': `${siteUrl}/#game-list` } : {}) },
  ],
})}</script>`;
html = html.replace('<!-- SITE_ORIGIN_METADATA -->', originMetadata);
html = html.replace('<!-- SITE_STRUCTURED_DATA -->', structuredData);
html = html.replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`);
html = html.replace(/(<meta name="description" content=")[^"]*(">)/, `$1${pageDescription}$2`);
html = html.replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${pageDescription}$2`);
html = html.replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${pageDescription}$2`);
html = html.replace(/103 free browser mini-games/g, `${games.length} free browser mini-games`);
await writeFile(outputIndex, html);

const pageTemplate = game => {
  const canonical = `${siteUrl}/games/${game.id}/`;
  const title = `${game.title} | Free ${game.category} Browser Game`;
  const description = `${game.description} ${game.instructions} Play ${game.title} free in your browser at One Second Games.`;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description,
    genre: game.category,
    gamePlatform: 'Web browser',
    playMode: 'SinglePlayer',
    url: canonical,
  };
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${siteUrl}/assets/social-card.png">
  <meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${siteUrl}/assets/social-card.png">
  <link rel="stylesheet" href="/styles.css?v=seo-arcade-2"><link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <script type="application/ld+json">${escapeJsonForHtml(data)}</script>
</head><body>
  <main class="seo-game-page" style="max-width:760px;margin:12vh auto;padding:24px;font:inherit">
    <p class="eyebrow">${escapeHtml(game.category)} · FREE BROWSER GAME</p>
    <h1>${escapeHtml(game.title)}</h1>
    <p>${escapeHtml(game.description)}</p>
    <h2>How to play</h2><p>${escapeHtml(game.instructions)}</p>
    <p><a class="button primary" href="/#games/${escapeHtml(game.id)}">Play ${escapeHtml(game.title)}</a></p>
    <h2>More ${escapeHtml(game.category)} games</h2><ul>${games.filter(other => other.category === game.category && other.id !== game.id).slice(0,4).map(other => `<li><a href="/games/${escapeHtml(other.id)}/">${escapeHtml(other.title)}</a> — ${escapeHtml(other.description)}</li>`).join('')}</ul>
    <p><a href="/#games">Browse all ${games.length} free games</a> · <a href="/">One Second Games home</a></p>
  </main>
</body></html>\n`;
};

const validGameId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
for (const game of games) {
  if (!validGameId.test(game.id)) throw new Error(`Invalid game URL id: ${game.id}`);
  const gameOutput = resolve(output, 'games', game.id, 'index.html');
  await mkdir(resolve(output, 'games', game.id), { recursive: true });
  await writeFile(gameOutput, pageTemplate(game));
}

const robots = [
  'User-agent: OAI-SearchBot',
  'Allow: /',
  '',
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n');
await writeFile(resolve(output, 'robots.txt'), robots);
const sitemapLocations = [`${siteUrl}/`, ...games.map(game => `${siteUrl}/games/${game.id}/`)];
const sitemapEntries = sitemapLocations.map(location => `<url><loc>${escapeHtml(location)}</loc></url>`).join('');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}</urlset>\n`;
await writeFile(resolve(output, 'sitemap.xml'), sitemap);
await writeFile(resolve(output, '_redirects'), '/* /404.html 404\n');
await writeFile(resolve(output, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found | One Second Games</title><link rel="stylesheet" href="/styles.css"></head><body><main class="seo-game-page" style="max-width:720px;margin:15vh auto;padding:24px"><p class="eyebrow">404 · OUT OF BOUNDS</p><h1>That page isn’t in the game library.</h1><p>Head back to One Second Games or browse the game collection.</p><p><a class="button primary" href="/">Go to homepage</a> <a class="button secondary" href="/#games">Browse games</a></p></main></body></html>`);
console.log(`Built ${games.length} game landing pages and ${sitemapLocations.length} sitemap URLs in ${output} for ${siteUrl}`);
