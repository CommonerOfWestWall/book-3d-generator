const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('../renderer/three.min.js');
const { hardcoverLayout, buildHardcover } = require('../renderer/book-model.js');

function materials() {
  return Object.fromEntries(['front', 'back', 'spine', 'edge', 'hinge', 'pageSide', 'pageTop', 'pageInner']
    .map((key, index) => [key, new THREE.MeshBasicMaterial({ color: 0x111111 + index * 0x111111 })]));
}
function bounds(object) { object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(object); }
function assertFiniteObject(object) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    for (const value of node.position.toArray()) assert(Number.isFinite(value));
    for (const value of node.geometry.attributes.position.array) assert(Number.isFinite(value));
    for (const value of node.geometry.attributes.uv.array) assert(Number.isFinite(value));
  });
}

for (const [label, dims] of Object.entries({ ordinary: [4, 6, 1.1], thin: [2.4, 3.1, 0.08], thick: [5.5, 8, 3.2] })) {
  test(`hardcover ${label} dimensions stay bounded`, () => {
    const [W, H, D] = dims;
    const layout = hardcoverLayout(W, H, D);
    assert(layout.boardThick > 0 && layout.boardThick <= D * 0.2);
    assert(layout.overhang >= 0 && layout.overhang <= Math.min(W / 2, H / 2));
    assert(layout.pageWidth > 0 && layout.pageHeight > 0 && layout.pageDepth > 0);
    const group = new THREE.Group();
    const result = buildHardcover(THREE, group, W, H, D, undefined, materials());
    const box = bounds(group);
    assert(Math.abs(box.min.x + W / 2) < 1e-6 && Math.abs(box.max.x - W / 2) < 1e-6);
    assert(Math.abs(box.min.y + H / 2) < 1e-6 && Math.abs(box.max.y - H / 2) < 1e-6);
    assert(Math.abs(box.min.z + D / 2) < 1e-6 && Math.abs(box.max.z - D / 2) < 1e-6);
    assertFiniteObject(group);
    assert.deepEqual([result.frontBoard.name, result.backBoard.name, result.spine.name, result.pageBlock.name],
      ['hardcover-front-board', 'hardcover-back-board', 'hardcover-spine', 'hardcover-page-block']);
  });
}

test('page block is inset and fully behind both boards', () => {
  const W = 4, H = 6, D = 1.1;
  const result = buildHardcover(THREE, new THREE.Group(), W, H, D, {}, materials());
  const page = bounds(result.pageBlock), layout = result.layout;
  assert(page.min.x > -W / 2 && page.max.x < W / 2);
  assert(page.min.y > -H / 2 && page.max.y < H / 2);
  assert(page.min.z > -D / 2 + layout.boardThick - 1e-9);
  assert(page.max.z < D / 2 - layout.boardThick + 1e-9);
});

test('spine shell does not overlap either board volume', () => {
  const result = buildHardcover(THREE, new THREE.Group(), 4, 6, 1.1, {}, materials());
  const spine = bounds(result.spineShell || result.spine);
  const front = bounds(result.frontBoard), back = bounds(result.backBoard);
  assert(spine.max.z <= front.min.z + 1e-7);
  assert(spine.min.z >= back.max.z - 1e-7);
});

test('materials remain opaque and cover/spine assignments are oriented', () => {
  const supplied = materials();
  const result = buildHardcover(THREE, new THREE.Group(), 4, 6, 1.1, {}, supplied);
  for (const mesh of [result.frontBoard, result.backBoard, result.spine, result.pageBlock]) {
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) assert.equal(material.opacity, 1);
  }
  assert.equal(result.spine.material, supplied.spine);
  assert.equal(result.frontBoard.material[4].map, supplied.front.map);
  assert.equal(result.backBoard.material[5].map, supplied.back.map);
  assert.equal(result.frontBoard.material[4].vertexColors, true);
  const geometry = result.spine.geometry, position = geometry.attributes.position, uv = geometry.attributes.uv;
  let backU = null, frontU = null;
  result.spine.updateMatrixWorld(true);
  for (let vertex = 0; vertex < position.count; vertex++) {
    const point = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(result.spine.matrixWorld);
    if (point.z < 0) backU = uv.getX(vertex);
    if (point.z > 0) frontU = uv.getX(vertex);
  }
  assert.equal(backU, 0); assert.equal(frontU, 1);
});

test('page top uses UV v along depth and page side uses UV u along depth', () => {
  const geometry = buildHardcover(THREE, new THREE.Group(), 4, 6, 1.1, {}, materials()).pageBlock.geometry;
  function depthUv(groupIndex, uvIndex) {
    const values = [];
    for (let i = geometry.groups[groupIndex].start; i < geometry.groups[groupIndex].start + geometry.groups[groupIndex].count; i++) {
      const vertex = geometry.index.getX(i);
      values.push([geometry.attributes.position.getZ(vertex), uvIndex === 0 ? geometry.attributes.uv.getX(vertex) : geometry.attributes.uv.getY(vertex)]);
    }
    return values;
  }
  const top = depthUv(2, 1), side = depthUv(0, 0);
  assert(new Set(top.map(([, value]) => value)).size > 1);
  assert(new Set(side.map(([, value]) => value)).size > 1);
  assert(top.some(([z, value]) => z < 0 && value !== top.find(([otherZ]) => otherZ > 0)[1]));
  assert(side.some(([z, value]) => z < 0 && value !== side.find(([otherZ]) => otherZ > 0)[1]));
});

test('front and back artwork are upright and unmirrored', () => {
  const result = buildHardcover(THREE, new THREE.Group(), 4, 6, 1.1, {}, materials());
  for (const [board, faceIndex, xSign] of [[result.frontBoard, 4, 1], [result.backBoard, 5, -1]]) {
    const geometry = board.geometry, face = geometry.groups[faceIndex];
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = face.start; i < face.start + face.count; i++) {
      const v = geometry.index.getX(i);
      assert(Math.abs(uv.getX(v) - (positions.getX(v) * xSign / 4 + .5)) < 1e-6);
      assert(Math.abs(uv.getY(v) - (positions.getY(v) / 6 + .5)) < 1e-6);
    }
  }
});
