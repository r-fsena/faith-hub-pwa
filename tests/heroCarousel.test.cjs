const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/HeroCarousel.tsx'),
  'utf8'
);

test('hero carousel always resolves an image when the tenant banner is empty', () => {
  assert.match(source, /const DEFAULT_HERO_IMAGE = 'https:\/\/images\.unsplash\.com\//);
  assert.match(source, /branding\?\.welcome_screen_config\?\.hero_image_url/);
  assert.match(source, /bgImage: resolveHeroImage\(branding\?\.banner_url, fallbackHeroImage\)/);
});

test('hero carousel replaces broken remote images and preserves the gradient as final fallback', () => {
  assert.match(source, /onError=\{handleHeroImageError\}/);
  assert.match(source, /image\.src = fallbackHeroImage/);
  assert.match(source, /image\.style\.display = 'none'/);
  assert.match(source, /var\(--accent-primary-gradient\)/);
});
