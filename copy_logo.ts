import * as fs from 'fs';
import * as path from 'path';

// Let's resolve the path relative to process.cwd()
const cwd = process.cwd();
const srcLogo = path.join(cwd, 'src', 'assets', 'images', 'aetheris_logo_1780822120316.png');

const destinations = [
  path.join(cwd, 'public', 'AElogo.png'),
  path.join(cwd, 'public', 'AEfavicon.png'),
  path.join(cwd, 'public', 'apple-touch-icon.png'),
  path.join(cwd, 'public', 'apple-touch-icon-precomposed.png'),
  path.join(cwd, 'public', 'android-chrome-192x192.png'),
  path.join(cwd, 'public', 'android-chrome-512x512.png'),
  path.join(cwd, 'public', 'icon-192.png'),
  path.join(cwd, 'public', 'icon-512.png'),
];

async function main() {
  console.log(`Checking source logo at: ${srcLogo}`);
  if (!fs.existsSync(srcLogo)) {
    console.error(`Source logo not found at relative path ${srcLogo}`);
    process.exit(1);
  }

  // Ensure /public directory exists
  const publicDir = path.join(cwd, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  for (const dest of destinations) {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.copyFileSync(srcLogo, dest);
    console.log(`Copied logo to ${dest}`);
  }

  console.log('All branding assets successfully configured!');
}

main().catch(console.error);
