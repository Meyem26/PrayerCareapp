const fs = require('fs');
const path = require('path');

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.PRAYERCARE_SUPABASE_URL;

const key =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PRAYERCARE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'js', 'config.js');
const contents = `/** Generated at deploy time — do not edit on the server */
window.PRAYERCARE_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseAnonKey: ${JSON.stringify(key)},
};
`;

fs.writeFileSync(configPath, contents, 'utf8');
console.log('Wrote js/config.js for production.');
