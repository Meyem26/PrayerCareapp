const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const siteUrl = (
  process.env.SITE_URL ||
  process.env.PRAYERCARE_SITE_URL ||
  'https://www.prayercare.online'
).replace(/\/$/, '');

function normalizeSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1\/?$/i, '');
}

const supabaseUrl = normalizeSupabaseUrl(
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.PRAYERCARE_SUPABASE_URL,
);

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PRAYERCARE_SUPABASE_ANON_KEY ||
  '';

const gaMeasurementId =
  process.env.GA_MEASUREMENT_ID || process.env.PRAYERCARE_GA_MEASUREMENT_ID || '';

function deriveAppUrl(site, explicit) {
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const parsed = new URL(site.startsWith('http') ? site : `https://${site}`);
    const host = parsed.hostname.replace(/^www\./i, '');
    return `https://app.${host}`;
  } catch {
    return 'https://app.prayercare.online';
  }
}

const appUrl = deriveAppUrl(
  siteUrl,
  process.env.APP_URL || process.env.PRAYERCARE_APP_URL,
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'WARNING: Missing Supabase env vars. Deploy will continue so Privacy/Terms pages publish. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY on Vercel when you need server-backed website features.',
  );
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
  appUrl: ${JSON.stringify(appUrl)},
  betaMode: ${JSON.stringify(
    process.env.EXPO_PUBLIC_BETA_MODE === 'true' ||
      process.env.PRAYERCARE_BETA_MODE === 'true',
  )},
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
  <url>
    <loc>${siteUrl}/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>${siteUrl}/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
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

function injectUrls(fileName, options = {}) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn('Skip missing file:', fileName);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/__SITE_URL__/g, siteUrl);
  html = html.replace(/__APP_URL__/g, appUrl);

  if (options.canonicalPath != null) {
    const canonical = `${siteUrl}${options.canonicalPath}`;
    html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonical}$2`);
    html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${canonical}$2`);
  }

  if (options.updateOgImage) {
    html = html.replace(
      /(<meta property="og:image" content=")[^"]*(")/,
      `$1${siteUrl}/assets/og-image.svg$2`,
    );
    html = html.replace(
      /(<meta name="twitter:image" content=")[^"]*(")/,
      `$1${siteUrl}/assets/og-image.svg$2`,
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Updated', fileName, 'with site URL:', siteUrl);
}

injectUrls('index.html', { canonicalPath: '/', updateOgImage: true });
injectUrls('privacy.html', { canonicalPath: '/privacy' });
injectUrls('terms.html', { canonicalPath: '/terms' });

console.log('Production build complete.');
