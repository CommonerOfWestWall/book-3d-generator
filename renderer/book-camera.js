(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BookCamera = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var referenceSlope = Math.tan(35 * Math.PI / 360);

  function applyProjection(camera, view, aspect) {
    var fov = view.fov === undefined ? 35 : view.fov;
    var x = (view.vanishX || 0) / 100;
    var y = (view.vanishY || 0) / 100;
    var slope = Math.tan(fov * Math.PI / 360);
    var compensation = referenceSlope / slope;
    camera.aspect = aspect;
    camera.fov = fov;
    camera.clearViewOffset();
    camera.position.set(0, view.height * compensation, view.zoom * compensation);
    camera.lookAt(0, 0, 0);
    var distance = camera.position.length();
    var halfHeight = distance * slope;
    // Translate in the camera plane, then shift the frustum to keep the
    // origin centered. Frustum shift alone would only pan the image.
    camera.translateX(2 * x * halfHeight * aspect);
    camera.translateY(2 * y * halfHeight);
    camera.far = Math.max(1000, camera.position.length() * 4);
    if (x || y) camera.setViewOffset(aspect, 1, -x * aspect, y, aspect, 1);
    else camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function fitDistance(radius, view, aspect) {
    var slope = Math.tan(view.fov * Math.PI / 360);
    var x = Math.abs(view.vanishX / 50);
    var y = Math.abs(view.vanishY / 50);
    // Distance to the tightest of the shifted frustum's four side planes.
    var horizontal = Math.hypot(1 / (slope * aspect), 1 + x);
    var vertical = Math.hypot(1 / slope, 1 + y);
    return radius * Math.max(horizontal, vertical) * 1.12 * slope / referenceSlope;
  }

  return { applyProjection: applyProjection, fitDistance: fitDistance };
}));
