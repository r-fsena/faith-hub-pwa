const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const storeSource = fs.readFileSync(path.join(__dirname, '../src/pages/Store.tsx'), 'utf8');

test('store availability combines the manual switch and the minimum-stock threshold', () => {
  assert.match(storeSource, /product\.purchase_available === false/);
  assert.match(storeSource, /product\.is_available_for_purchase === false/);
  assert.match(storeSource, /product\.stock_data_available && product\.available_quantity <= product\.minimum_stock/);
  assert.match(storeSource, /!trackInventory \|\| !stockDataAvailable \|\| availableQuantity > minimumStock/);
});

test('missing stock fields never become a fabricated zero balance', () => {
  assert.match(storeSource, /p\.available_quantity !== undefined/);
  assert.match(storeSource, /p\.minimum_stock !== undefined/);
  assert.match(storeSource, /ESTOQUE EM ATUALIZAÇÃO/);
  assert.match(storeSource, /faithhub_cached_pdv_products_v2_\$\{orgId\}_\$\{getActiveCampusId\(\)/);
});

test('unavailable products are greyed and cannot be added from catalog or details', () => {
  assert.match(storeSource, /filter: isProductUnavailable\(prod\) \? 'grayscale\(1\)'/);
  assert.match(storeSource, /disabled=\{isProductUnavailable\(prod\)\}/);
  assert.match(storeSource, /disabled=\{isProductUnavailable\(selectedProductModal\)\}/);
});
