const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const ts = require('typescript');
const moduleObject = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/services/campusDiscovery.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: moduleObject.exports, module: moduleObject, Intl });
const { coordinates, distanceKm, orderCampuses, formatDistance } = moduleObject.exports;
const unit = (id, name, lat, lng, organization_id = 'org-a') => ({ id, name, organization_id, latitude: lat, longitude: lng });
const list = [unit('far', 'A distante', -30, -50), unit('near', 'Z próxima', -27.6, -48.6), unit('home', 'Minha', 40, -74), unit('unknown', 'Sem ponto', null, null), unit('other', 'Outra igreja', -27.6, -48.6, 'org-b')];
const position = { latitude: -27.6, longitude: -48.6 };
test('actual local member campus stays first even when it is far away; other units use distance', () => {
  const result = orderCampuses(list, 'org-a', { organization_id: 'org-a', campus_id: 'home' }, position);
  assert.deepEqual(Array.from(result, r => r.campus.id), ['home', 'near', 'far', 'unknown']);
  assert.equal(result[0].isHome, true); assert.equal(result[1].distance, 0);
});
test('foreign membership cannot pin a campus; foreign campuses never appear', () => {
  const result = orderCampuses(list, 'org-a', { organization_id: 'org-b', campus_id: 'home' }, position);
  assert.equal(result[0].campus.id, 'near'); assert.equal(result.some(r => r.isHome), false); assert.equal(result.length, 4);
});
test('without GPS: actual home first, then deterministic names, including missing coordinates', () => {
  assert.deepEqual(Array.from(orderCampuses(list, 'org-a', { organization_id: 'org-a', campus_id: 'home' }, null), r => r.campus.id), ['home', 'far', 'unknown', 'near']);
});
test('anonymous users are ordered by real proximity; headquarters does not override distance', () => {
  const result = orderCampuses(list.map(c => ({ ...c, is_headquarters: c.id === 'far' })), 'org-a', null, position);
  assert.equal(result[0].campus.id, 'near'); assert.equal(result.at(-1).campus.id, 'unknown');
});
test('null, empty, booleans, non-finite and out-of-range coordinates are rejected; explicit zero is valid', () => {
  for (const value of [null, undefined, '', ' ', false, NaN, Infinity, 'abc']) assert.equal(coordinates({ latitude: value, longitude: 0 }), null);
  assert.equal(coordinates({ latitude: 91, longitude: 0 }), null); assert.equal(coordinates({ latitude: 0, longitude: 181 }), null);
  assert.equal(coordinates({ latitude: '0', longitude: '0' }).latitude, 0);
});
test('distance is finite at antipodes and formatted without implying driving distance', () => {
  assert.ok(Math.abs(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 }) - 20015.1144) < .01);
  assert.equal(formatDistance(0), '0 m'); assert.equal(formatDistance(.123), '123 m'); assert.equal(formatDistance(12.36), '12,4 km');
});
