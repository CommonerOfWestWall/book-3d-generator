const test = require('node:test');
const assert = require('node:assert/strict');
const presets = require('../renderer/view-presets.js');

const legacyView = { az: 12, el: -8, rotZ: 3, zoom: 120, height: 4 };
const view = { ...legacyView, fov: 42, vanishX: -12, vanishY: 18 };
const state = {
  views: [{ id: 'custom-sample-1', name: '  春季   封面 ', view }],
  selected: ['custom-sample-1', 'builtin-front', 'custom-sample-1']
};

test('encode/decode round trip preserves all eight view fields and writes version 2', () => {
  const decoded = presets.decode(presets.encode(state));
  assert.match(presets.encode(state), /"version":2/);
  assert.deepEqual(decoded, {
    views: [{ id: 'custom-sample-1', name: '春季 封面', view }],
    selected: ['custom-sample-1', 'builtin-front']
  });
});

test('decode accepts null as empty state', () => {
  assert.deepEqual(presets.decode(null), { views: [], selected: null });
});

test('decode accepts legacy version 1 with default projection fields without mutating raw data', () => {
  const raw = JSON.stringify({ version: 1, views: [{ id: 'custom-legacy', name: 'legacy', view: legacyView }], selected: null });
  assert.deepEqual(presets.decode(raw).views[0].view, { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 });
  assert.equal(raw, JSON.stringify({ version: 1, views: [{ id: 'custom-legacy', name: 'legacy', view: legacyView }], selected: null }));
});

test('encode upgrades valid legacy five-field input to canonical version 2', () => {
  const encoded = presets.encode({ views: [{ id: 'custom-legacy', name: 'legacy', view: legacyView }], selected: null });
  assert.match(encoded, /^\{"version":2/);
  assert.deepEqual(presets.decode(encoded).views[0].view, { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 });
});

test('decode rejects invalid JSON, versions, and wrong numeric values', () => {
  assert.throws(() => presets.decode('{'), /有效 JSON/);
  for (const version of [0, 3]) {
    assert.throws(() => presets.decode(JSON.stringify({ version, views: [], selected: null })), /版本/);
  }
  assert.throws(() => presets.decode(JSON.stringify({ version: 1, views: [{ id: 'custom-x', name: 'x', view: { ...legacyView, zoom: null } }], selected: null })), /有限数字/);
  for (const field of ['az', 'el', 'rotZ', 'zoom', 'height', 'fov', 'vanishX', 'vanishY']) {
    const invalid = { ...view, [field]: field === 'fov' ? null : '12' };
    assert.throws(() => presets.validateView(invalid), /有限数字/);
  }
});

test('validateView returns all eight canonical fields and enforces projection ranges', () => {
  for (const [field, value] of [['az', 181], ['el', -181], ['rotZ', 181], ['zoom', 7], ['height', 1001], ['fov', 9], ['fov', 71], ['vanishX', -41], ['vanishX', 41], ['vanishY', -41], ['vanishY', 41]]) {
    assert.throws(() => presets.validateView({ ...view, [field]: value }), /超出/);
  }
  assert.deepEqual(presets.validateView({ ...legacyView, extra: 9 }), { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 });
  for (const field of ['fov', 'vanishX', 'vanishY']) {
    assert.throws(() => presets.validateView({ ...view, [field]: Number.NaN }), /有限数字/);
    assert.throws(() => presets.validateView({ ...view, [field]: null }), /有限数字/);
  }
});

test('version 2 requires every projection field and validates present version 1 projection fields', () => {
  const make = (version, candidate) => JSON.stringify({ version, views: [{ id: 'custom-x', name: 'x', view: candidate }], selected: null });
  for (const field of ['fov', 'vanishX', 'vanishY']) {
    const missing = { ...view };
    delete missing[field];
    assert.throws(() => presets.decode(make(2, missing)), /缺少字段/);
    assert.throws(() => presets.decode(make(1, { ...legacyView, [field]: null })), /有限数字/);
  }
  assert.deepEqual(presets.decode(make(1, { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 })).views[0].view, { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 });
});

test('decode rejects malformed and duplicate IDs/names', () => {
  const make = (views) => JSON.stringify({ version: 1, views, selected: null });
  assert.throws(() => presets.decode(make([{ id: 'custom- bad', name: 'a', view: legacyView }])), /ID/);
  assert.throws(() => presets.decode(make([{ id: 'custom-a', name: 'a', view: legacyView }, { id: 'custom-a', name: 'b', view: legacyView }])), /ID 不能重复/);
  assert.throws(() => presets.decode(make([{ id: 'front', name: 'a', view: legacyView }])), /ID/);
  assert.throws(() => presets.decode(make([{ id: 'custom-a', name: 'Name', view: legacyView }, { id: 'custom-b', name: ' name ', view: legacyView }])), /名称不能重复/);
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
