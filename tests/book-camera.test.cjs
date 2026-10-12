const test = require('node:test');
const assert = require('node:assert/strict');
const THREE = require('../renderer/three.min.js');
const { applyProjection, fitDistance } = require('../renderer/book-camera.js');
const defaults = { zoom: 12, height: 0, fov: 35, vanishX: 0, vanishY: 0 };
const close = (a, b) => assert(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
function make(view = {}, aspect = 1) {
  const camera = new THREE.PerspectiveCamera(35, aspect, .1, 1000);
  applyProjection(camera, { ...defaults, ...view }, aspect);
  return camera;
}

test('default projection exactly matches the previous camera', () => {
  const old = new THREE.PerspectiveCamera(35, 1, .1, 1000);
  old.position.set(0, 2, 12); old.lookAt(0, 0, 0); old.updateMatrixWorld(true);
  const current = make({ height: 2 });
  assert.deepEqual(current.position.toArray(), old.position.toArray());
  assert.deepEqual(current.projectionMatrix.toArray(), old.projectionMatrix.toArray());
  assert.deepEqual(current.matrixWorld.toArray(), old.matrixWorld.toArray());
});

test('FOV compensation preserves center-plane size while changing depth perspective', () => {
  const flat = make({ fov: 10 }), strong = make({ fov: 70 });
  close(new THREE.Vector3(1, 0, 0).project(flat).x, new THREE.Vector3(1, 0, 0).project(strong).x);
  const edgeRatio = cam => new THREE.Vector3(0, 1, 1).project(cam).y / new THREE.Vector3(0, 1, -1).project(cam).y;
  assert(edgeRatio(strong) > edgeRatio(flat) + .2, 'Strong perspective must increase near/far size disparity');
});

test('lens vanishing point moves depth projection without panning the origin', () => {
  const center = make(), shifted = make({ vanishX: 30, vanishY: -20 });
  const origin = new THREE.Vector3().project(shifted);
  close(origin.x, 0); close(origin.y, 0);
  const vp = new THREE.Vector3(0, 0, -1e12).project(shifted);
  assert(Math.abs(vp.x - .6) < 1e-9);
  assert(Math.abs(vp.y + .4) < 1e-9);
  assert(Math.abs(new THREE.Vector3(0, 0, 1).project(shifted).x - new THREE.Vector3(0, 0, 1).project(center).x) > .01);
});

test('projection stays centered and finite across FOV, shift, height and aspect limits', () => {
  for (const fov of [10, 35, 70]) for (const vanishX of [-40, 0, 40]) for (const vanishY of [-40, 0, 40]) {
    for (const aspect of [.75, 1, 1.5]) {
      const camera = make({ fov, vanishX, vanishY, height: 20 }, aspect);
      const origin = new THREE.Vector3().project(camera);
      close(origin.x, 0); close(origin.y, 0);
      assert(camera.projectionMatrix.elements.every(Number.isFinite));
      close(camera.aspect, aspect);
    }
  }
  const far = make({ zoom: 1000, height: 1000, fov: 10 });
  assert(new THREE.Vector3().project(far).z < 1, 'Long-lens saved cameras must not cross the far plane');
});

test('fit distance keeps a bounding sphere inside all shifted frustum planes', () => {
  for (const fov of [10, 35, 70]) for (const vanishX of [-40, 0, 40]) for (const vanishY of [-40, 0, 40]) {
    const view = { ...defaults, fov, vanishX, vanishY };
    view.zoom = fitDistance(4, view, .8);
    const camera = make(view, .8);
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    assert(frustum.planes.every(plane => plane.distanceToPoint(new THREE.Vector3()) > 4), 'Sphere must fit without clipping');
  }
});
