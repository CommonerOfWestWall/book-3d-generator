(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BookModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function positive(value, name) {
    var number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      throw new TypeError(name + ' must be a finite positive number');
    }
    return number;
  }

  function percent(value, fallback) {
    var number = value === undefined ? fallback : Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function hardcoverLayout(W, H, D, options) {
    W = positive(W, 'W');
    H = positive(H, 'H');
    D = positive(D, 'D');
    options = options || {};

    var boardPercent = percent(options.boardPercent, 1.2);
    var overhangPercent = percent(options.overhangPercent, 1.8);

    // D is the outside depth. Keeping each board below 20% of D leaves a
    // positive page block even for unusually thin books.
    var boardThick = Math.min(W * boardPercent / 100, D * 0.2);
    var overhang = Math.min(W * overhangPercent / 100, W * 0.1, H * 0.1);
    var spineWidth = Math.min(Math.max(boardThick, W * 0.035), W * 0.12);
    var pageDepth = D - boardThick * 2;
    var pageWidth = W - spineWidth - overhang;
    var pageHeight = H - overhang * 2;

    return {
      width: W,
      height: H,
      depth: D,
      boardPercent: boardPercent,
      overhangPercent: overhangPercent,
      boardThick: boardThick,
      overhang: overhang,
      spineWidth: spineWidth,
      pageDepth: pageDepth,
      pageWidth: pageWidth,
      pageHeight: pageHeight,
      boardBounds: {
        minX: -W / 2, maxX: W / 2,
        minY: -H / 2, maxY: H / 2,
        minZ: -D / 2, maxZ: D / 2
      },
      pageCenterX: -W / 2 + spineWidth + pageWidth / 2
    };
  }

  function material(materials, key) {
    if (!materials || !materials[key]) {
      throw new TypeError('materials.' + key + ' is required');
    }
    return materials[key];
  }

  function box(THREE, group, name, size, position, materialList) {
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), materialList);
    mesh.name = name;
    mesh.position.set(position[0], position[1], position[2]);
    group.add(mesh);
    return mesh;
  }

  function buildHardcover(THREE, group, W, H, D, options, materials) {
    if (!THREE || !THREE.BoxGeometry || !THREE.Mesh) {
      throw new TypeError('THREE with BoxGeometry and Mesh is required');
    }
    if (!group || typeof group.add !== 'function') {
      throw new TypeError('group with add() is required');
    }
    var layout = hardcoverLayout(W, H, D, options);
    var front = material(materials, 'front');
    var back = material(materials, 'back');
    var spine = material(materials, 'spine');
    var edge = material(materials, 'edge');
    var hinge = material(materials, 'hinge');
    var pageSide = material(materials, 'pageSide');
    var pageTop = material(materials, 'pageTop');
    var pageInner = material(materials, 'pageInner');

    group.name = group.name || 'hardcover';

    // BoxGeometry groups are +X, -X, +Y, -Y, +Z, -Z. The image materials
    // therefore stay on the two outside cover faces only.
    var frontBoard = box(THREE, group, 'hardcover-front-board',
      [W, H, layout.boardThick], [0, 0, D / 2 - layout.boardThick / 2],
      [edge, edge, edge, edge, front, edge]);
    var backBoard = box(THREE, group, 'hardcover-back-board',
      [W, H, layout.boardThick], [0, 0, -D / 2 + layout.boardThick / 2],
      [edge, edge, edge, edge, edge, back]);

    // The shell fits BETWEEN boards. Extending its +Z/-Z faces to the outer
    // covers would cause coplanar faces and erase the binding-side artwork.
    var spineShell = box(THREE, group, 'hardcover-spine-shell',
      [layout.spineWidth, H, layout.pageDepth],
      [-W / 2 + layout.spineWidth / 2, 0, 0],
      [hinge, edge, edge, edge, edge, edge]);
    var spineMesh = new THREE.Mesh(new THREE.PlaneGeometry(D, H), spine);
    spineMesh.name = 'hardcover-spine';
    spineMesh.position.x = -W / 2;
    spineMesh.rotation.y = -Math.PI / 2;
    spine.polygonOffset = true;
    spine.polygonOffsetFactor = -1;
    spine.polygonOffsetUnits = -1;
    group.add(spineMesh);

    // Recess the continuous cover surface without changing its UVs or aspect.
    // A restrained vertex tint makes the joint readable without scene lighting.
    [frontBoard, backBoard].forEach(function (board, index) {
      board.geometry.dispose();
      board.geometry = new THREE.BoxGeometry(W, H, layout.boardThick, 160, 1, 1);
      var positions = board.geometry.attributes.position;
      var sign = index === 0 ? 1 : -1;
      var colors = [];
      var center = -W / 2 + layout.spineWidth;
      var halfWidth = W * 0.012;
      for (var i = 0; i < positions.count; i++) {
        var groove = Math.max(0, 1 - Math.abs(positions.getX(i) - center) / halfWidth);
        var outside = positions.getZ(i) * sign > 0;
        if (outside) positions.setZ(i, positions.getZ(i) - sign * groove * layout.boardThick * 0.16);
        var tint = outside ? 1 - groove * 0.12 : 1;
        colors.push(tint, tint, tint);
      }
      board.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      board.geometry.computeVertexNormals();
      var faceIndex = index === 0 ? 4 : 5;
      board.material[faceIndex] = board.material[faceIndex].clone();
      board.material[faceIndex].vertexColors = true;
    });

    var pageBlock = box(THREE, group, 'hardcover-page-block',
      [layout.pageWidth, layout.pageHeight, layout.pageDepth],
      [layout.pageCenterX, 0, 0],
      [pageSide, pageSide, pageTop, pageTop, pageInner, pageInner]);

    return {
      layout: layout,
      group: group,
      frontBoard: frontBoard,
      backBoard: backBoard,
      spine: spineMesh,
      spineShell: spineShell,
      pageBlock: pageBlock
    };
  }

  return { hardcoverLayout: hardcoverLayout, buildHardcover: buildHardcover };
}));
