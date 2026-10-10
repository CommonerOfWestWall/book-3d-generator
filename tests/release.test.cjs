const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRelease, checkTag } = require('../scripts/check-release.cjs');

test('package, Rust, Tauri, UI and release notes have consistent versions', () => {
  assert.equal(checkRelease(), '1.2.0');
});

test('release tags must match the application version exactly', () => {
  assert.doesNotThrow(() => checkTag('1.2.0', 'v1.2.0'));
  assert.throws(() => checkTag('1.2.0', 'v1.1.0'), /Release tag must match/);
  assert.throws(() => checkTag('1.2.0', '1.2.0'), /Release tag must match/);
});
