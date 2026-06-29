const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const siteUrl = (
  process.env.SITE_URL ||
  process.env.PRAYERCARE_SITE_URL ||
  'https://prayercare.app'
).replace(/\/$/, '');

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PRAYERCARE_SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PRAYERCARE_SUPABASE_ANON_KEY;

const gaMeasurementId =
  process.env.GA_MEASUREMENT_ID || process.env.PRAYERCARE_GA_MEASUREMENT_ID || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
  process.exit(1);
}

// config.js
fs.writeFileSync(
  path.join(root, 'js', 'config.js'),
  `/** Generated at deploy time */
window.PRAYERCARE_CONFIG = {
  supabaseUrl: ${JSON.stringify(supabaseUrl)},
  supabaseAnonKey: ${JSON.stringify(supabaseAnonKey)},
  siteUrl: ${JSON.stringify(siteUrl)},
  gaMeasurementId: ${JSON.stringify(gaMeasurementId)},
};
`,
  'utf8',
);
console.log('Wrote js/config.js');

// sitemap.xml
fs.writeFileSync(
  path.join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
  'utf8',
);
console.log('Wrote sitemap.xml');

// robots.txt
fs.writeFileSync(
  path.join(root, 'robots.txt'),
  `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`,
  'utf8',
);
console.log('Wrote robots.txt');

// Inject production URLs into index.html (idempotent — safe to run every deploy)
const indexPath = path.join(root, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace(/__SITE_URL__/g, siteUrl);
indexHtml = indexHtml.replace(
  /(<link rel="canonical" href=")[^"]*(")/,
  `$1${siteUrl}/$2`,
);
indexHtml = indexHtml.replace(
  /(<meta property="og:url" content=")[^"]*(")/,
  `$1${siteUrl}/$2`,
);
indexHtml = indexHtml.replace(
  /(<meta property="og:image" content=")[^"]*(")/,
  `$1${siteUrl}/assets/og-image.svg$2`,
);
indexHtml = indexHtml.replace(
  /(<meta name="twitter:image" content=")[^"]*(")/,
  `$1${siteUrl}/assets/og-image.svg$2`,
);

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('Updated index.html with site URL:', siteUrl);
console.log('Production build complete.');
