const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storeSource = fs.readFileSync(path.join(__dirname, '../src/pages/Store.tsx'), 'utf8');

test('store availability combines the manual switch and the minimum-stock threshold', () => {
  assert.match(storeSource, /product\.purchase_available === false/);
  assert.match(storeSource, /product\.is_available_for_purchase === false/);
  assert.match(storeSource, /product\.available_quantity <= product\.minimum_stock/);
});

test('unavailable products are greyed and cannot be added from catalog or details', () => {
  assert.match(storeSource, /filter: isProductUnavailable\(prod\) \? 'grayscale\(1\)'/);
  assert.match(storeSource, /disabled=\{isProductUnavailable\(prod\)\}/);
  assert.match(storeSource, /disabled=\{isProductUnavailable\(selectedProductModal\)\}/);
});
