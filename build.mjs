import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { games, categories } from './js/games/registry.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
  'assets',
  'js',
];
const pageTitle = 'One Second Games | Free Quick Browser Mini-Games';
const pageDescription = 'Play 103 free browser mini-games: reflex tests, memory and math challenges, visual puzzles, and quick arcade games. No account or download required.';
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const escapeJsonForHtml = value => JSON.stringify(value).replace(/</g, '\\u003c');
const configuredSiteUrl = process.env.PUBLIC_SITE_URL || process.env.URL || '';
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
  const entries = games.filter(game => game.category === category).map(game => `<li><strong>${escapeHtml(game.title)}</strong> — ${escapeHtml(game.description)}</li>`).join('');
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
await writeFile(outputIndex, html);

const robots = [
  'User-agent: OAI-SearchBot',
  'Allow: /',
  '',
  'User-agent: *',
  'Allow: /',
  ...(siteUrl ? ['', `Sitemap: ${siteUrl}/sitemap.xml`] : []),
  '',
].join('\n');
await writeFile(resolve(output, 'robots.txt'), robots);
const sitemapEntries = siteUrl ? `<url><loc>${siteUrl}/</loc></url>` : '';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}</urlset>\n`;
await writeFile(resolve(output, 'sitemap.xml'), sitemap);
await writeFile(resolve(output, '_redirects'), '/* /index.html 200\n');
console.log(`Built ${games.length} game entries in ${output}${siteUrl ? ` for ${siteUrl}` : ' (set PUBLIC_SITE_URL to emit canonical URLs)'}`);
