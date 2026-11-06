const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('PWA tracks explicit content behavior without blocking primary journeys', () => {
  const service = read('src/services/contentEngagement.ts');
  const telemetry = read('src/services/usageTelemetry.ts');
  const combined = ['src/pages/Events.tsx', 'src/pages/Devotionals.tsx', 'src/components/LivePlayerModal.tsx', 'src/pages/CellGroups.tsx'].map(read).join('\n');
  assert.match(service, /recordUsage/);
  assert.match(telemetry, /intelligence\/events/);
  assert.match(telemetry, /keepalive:\s*true/);
  assert.match(telemetry, /current\?\.enabled/);
  assert.match(combined, /content\.analytics_dashboard/);
  for (const type of ['EVENT', 'BROADCAST', 'DEVOTIONAL', 'STUDY_BOOK', 'STUDY_CHAPTER']) assert.match(combined, new RegExp(`['"]${type}['"]`));
  assert.doesNotMatch(service, /BIBLE/);
});
