const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/DigitalMemberCard.tsx'),
  'utf8'
);

test('digital member card keeps only the active face visible across WebKit browsers', () => {
  assert.match(source, /WebkitTransformStyle:\s*'preserve-3d'/);
  assert.equal((source.match(/WebkitBackfaceVisibility:\s*'hidden'/g) || []).length, 2);
  assert.match(source, /opacity:\s*isFlipped \? 0 : 1/);
  assert.match(source, /opacity:\s*isFlipped \? 1 : 0/);
  assert.match(source, /pointerEvents:\s*isFlipped \? 'none' : 'auto'/);
  assert.match(source, /pointerEvents:\s*isFlipped \? 'auto' : 'none'/);
});
