const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verify } = require('./verify-production-release.cjs');
const env = { AWS_APP_ID: 'd312p1jp7kl7kp', AWS_BRANCH: 'main', AWS_COMMIT_ID: 'HEAD', FAITH_PRODUCTION_RELEASE_ID: 'FH-20261112-001', FAITH_PRODUCTION_RELEASE_COMMIT: 'a'.repeat(40) };
test('production requires approved release, correct destination and exact actual checkout', () => {
  assert.doesNotThrow(() => verify(env, () => 'a'.repeat(40)));
  for (const patch of [{ AWS_APP_ID: 'wrong-app' }, { AWS_BRANCH: 'develop' }, { FAITH_PRODUCTION_RELEASE_ID: '' }, { FAITH_PRODUCTION_RELEASE_COMMIT: '' }]) assert.throws(() => verify({ ...env, ...patch }, () => 'a'.repeat(40)));
  assert.throws(() => verify(env, () => 'b'.repeat(40)), /commit aprovado/);
});
