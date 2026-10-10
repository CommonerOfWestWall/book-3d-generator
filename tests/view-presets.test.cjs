const test = require('node:test');
const assert = require('node:assert/strict');
const presets = require('../renderer/view-presets.js');

const view = { az: 12, el: -8, rotZ: 3, zoom: 120, height: 4 };
const state = {
  views: [{ id: 'custom-sample-1', name: '  春季   封面 ', view }],
  selected: ['custom-sample-1', 'builtin-front', 'custom-sample-1']
};

test('encode/decode round trip preserves all five view fields', () => {
  const decoded = presets.decode(presets.encode(state));
  assert.deepEqual(decoded, {
    views: [{ id: 'custom-sample-1', name: '春季 封面', view }],
    selected: ['custom-sample-1', 'builtin-front']
  });
});

test('decode accepts null as empty state', () => {
  assert.deepEqual(presets.decode(null), { views: [], selected: null });
});

test('decode rejects invalid JSON, versions, and wrong numeric values', () => {
  assert.throws(() => presets.decode('{'), /有效 JSON/);
  assert.throws(() => presets.decode(JSON.stringify({ version: 2, views: [], selected: null })), /版本/);
  assert.throws(() => presets.decode(JSON.stringify({ version: 1, views: [{ id: 'custom-x', name: 'x', view: { ...view, zoom: null } }], selected: null })), /有限数字/);
  for (const field of ['az', 'el', 'rotZ', 'zoom', 'height']) {
    const invalid = { ...view, [field]: '12' };
    assert.throws(() => presets.validateView(invalid), /有限数字/);
  }
});

test('validateView rejects out-of-range values and returns only five fields', () => {
  for (const [field, value] of [['az', 181], ['el', -181], ['rotZ', 181], ['zoom', 7], ['height', 1001]]) {
    assert.throws(() => presets.validateView({ ...view, [field]: value }), /超出/);
  }
  assert.deepEqual(presets.validateView({ ...view, extra: 9 }), view);
});

test('decode rejects malformed and duplicate IDs/names', () => {
  const make = (views) => JSON.stringify({ version: 1, views, selected: null });
  assert.throws(() => presets.decode(make([{ id: 'custom- bad', name: 'a', view }])), /ID/);
  assert.throws(() => presets.decode(make([{ id: 'custom-a', name: 'a', view }, { id: 'custom-a', name: 'b', view }])), /ID 不能重复/);
  assert.throws(() => presets.decode(make([{ id: 'front', name: 'a', view }])), /ID/);
  assert.throws(() => presets.decode(make([{ id: 'custom-a', name: 'Name', view }, { id: 'custom-b', name: ' name ', view }])), /名称不能重复/);
});

test('names use Unicode character length and reject controls', () => {
  assert.equal(presets.normalizeName('😀'.repeat(40)).length, 80);
  assert.throws(() => presets.normalizeName('😀'.repeat(41)), /40/);
  assert.throws(() => presets.normalizeName('a\n b'), /控制字符/);
});

test('safeFilename handles unsafe and reserved Windows names', () => {
  assert.equal(presets.safeFilename('CON.txt'), '_CON.txt');
  assert.equal(presets.safeFilename('report:final?.txt'), 'report_final_.txt');
  assert.equal(presets.safeFilename('name...'), 'name_');
  assert.equal(presets.safeFilename('   '), '_');
  assert.equal(Array.from(presets.safeFilename('😀'.repeat(70))).length, 60);
  assert.equal(presets.safeFilename(''), 'view');
});
