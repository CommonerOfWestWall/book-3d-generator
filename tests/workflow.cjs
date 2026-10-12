const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const baselineRef = 'e50deacae62311eb0e274386558fa67af879ed3c'; // Original 1.1 renderer, independent of the current HEAD.
const output = process.env.BOOK3D_TEST_OUTPUT || path.join(root, 'renderer/test_screenshots');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  try {
    if (req.url === '/baseline') {
      const html = execFileSync('git', ['show', baselineRef + ':renderer/index.html'], { cwd: root, encoding: 'utf8' });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html.replace('<head>', '<head><base href="/">'));
      return;
    }
    const name = decodeURIComponent(req.url.split('?')[0]);
    const file = path.resolve(root, 'renderer', '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(path.join(root, 'renderer') + path.sep)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(url);
    await page.waitForFunction(() => typeof renderer !== 'undefined' && renderer);
    await page.click('#test-btn');
    await page.waitForFunction(() => document.getElementById('spine-preview-img').naturalWidth > 0);
    await page.screenshot({ path: path.join(output, 'crop-editor.png') });
    await page.click('#spine-confirm-btn');
    await page.waitForFunction(() => !document.getElementById('spine-modal').classList.contains('open'));
    await page.click('[data-type="hardcover"]');
    assert.equal(await page.locator('.type-btn.active').getAttribute('data-type'), 'hardcover');
    await page.evaluate(() => waitForTextures());
    await page.screenshot({ path: path.join(output, 'hardcover-desktop.png'), animations: 'disabled' });
    console.log('Desktop crop and hardcover render OK');
    const canvas = page.locator('#canvas-container canvas');
    const initialCanvas = await canvas.screenshot();
    const rect = await canvas.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 45, rect.y + rect.height / 2 + 15); await page.mouse.up();
    const movedCanvas = await canvas.screenshot();
    assert.notDeepEqual(movedCanvas, initialCanvas, 'Pointer rotation must change rendered pixels');
    await page.click('#reset-btn');
    await page.fill('#board-input', '2.0'); await page.locator('#board-input').press('Tab');
    assert.equal(await page.evaluate(() => hardcoverOptions.boardPercent), 2);
    await page.fill('#overhang-input', '3.0'); await page.locator('#overhang-input').press('Tab');
    assert.equal(await page.evaluate(() => hardcoverOptions.overhangPercent), 3);
    await page.fill('#board-input', '1.2'); await page.locator('#board-input').press('Tab');
    await page.fill('#overhang-input', '1.8'); await page.locator('#overhang-input').press('Tab');
    console.log('Pointer rotation changes canvas pixels; hardcover numeric adjustments OK');

    // Spine thickness is a session-only presentation scale. Keep all source
    // artwork, crop state, framing and camera values fixed while checking it.
    const assertClose = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-9, message || `${actual} ~= ${expected}`);
    const measureThickness = () => page.evaluate(() => {
      const savedRotation = bookGroup.rotation.clone();
      bookGroup.rotation.set(0, 0, 0);
      bookGroup.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(bookGroup);
      const pageBlock = bookGroup.getObjectByName('hardcover-page-block');
      const pageBounds = pageBlock ? new THREE.Box3().setFromObject(pageBlock) : null;
      bookGroup.rotation.copy(savedRotation);
      bookGroup.updateMatrixWorld(true);
      return {
        type: bookType,
        thickness: spineThicknessPercent,
        baseDepth: baseBookDepth,
        depth: bookSize.d,
        width: bookSize.w,
        height: bookSize.h,
        boundsZ: bounds.max.z - bounds.min.z,
        pageBlockZ: pageBounds ? pageBounds.max.z - pageBounds.min.z : null,
        images: { back: images.back, spine: images.spine, cover: images.cover },
        crop: { spineLeft, spineRight, cropLeft, cropRight, flapCropEnabled },
        fullImageData,
        camera: [rotX, rotY, rotZ, cameraDistance, cameraHeight],
        depthMeta: document.getElementById('depth-meta').textContent
      };
    });
    const thicknessOriginal = await measureThickness();
    assert.equal(thicknessOriginal.thickness, 100);
    assert.equal(await page.inputValue('#thickness-slider'), '100');
    assert.equal(await page.inputValue('#thickness-input'), '100');
    const originalExport = await page.evaluate(() => getExportDataURL('png', 1024));
    const hardcoverOriginalPixels = await canvas.screenshot();
    await page.click('[data-type="paperback"]');
    await page.evaluate(() => waitForTextures());
    const paperbackOriginal = await measureThickness();
    const paperbackOriginalExport = await page.evaluate(() => getExportDataURL('png', 1024));
    const paperbackOriginalPixels = await canvas.screenshot();
    assert.equal(paperbackOriginal.thickness, 100);
    await page.click('[data-type="hardcover"]');
    await page.evaluate(() => waitForTextures());

    await page.locator('#thickness-slider').evaluate(el => {
      el.value = '200';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => waitForTextures());
    const hardcoverThick = await measureThickness();
    assert.equal(hardcoverThick.thickness, 200);
    assertClose(hardcoverThick.depth, hardcoverThick.baseDepth * 2);
    assertClose(hardcoverThick.boundsZ, thicknessOriginal.boundsZ * 2);
    assert(hardcoverThick.pageBlockZ > thicknessOriginal.pageBlockZ, 'Hardcover page block must use the thicker effective depth');
    assert.equal(hardcoverThick.width, thicknessOriginal.width);
    assert.equal(hardcoverThick.height, thicknessOriginal.height);
    assert.deepEqual(hardcoverThick.images, thicknessOriginal.images);
    assert.deepEqual(hardcoverThick.crop, thicknessOriginal.crop);
    assert.equal(hardcoverThick.fullImageData, thicknessOriginal.fullImageData);
    assert.deepEqual(hardcoverThick.camera, thicknessOriginal.camera);
    assert.equal(hardcoverThick.depthMeta, (hardcoverThick.depth / hardcoverThick.width * 100).toFixed(1) + '%');
    await page.screenshot({ path: path.join(output, 'thickness-hardcover.png'), animations: 'disabled' });
    const hardcoverPixels = await canvas.screenshot();
    const hardcoverExport = await page.evaluate(() => getExportDataURL('png', 1024));
    assert.notDeepEqual(hardcoverPixels, hardcoverOriginalPixels, '200% thickness must change preview pixels');
    assert.notEqual(hardcoverExport, originalExport, 'Export capture must reflect thickness');

    await page.fill('#thickness-input', '150');
    await page.locator('#thickness-input').press('Enter');
    await page.evaluate(() => waitForTextures());
    const hardcover150 = await measureThickness();
    assert.equal(hardcover150.thickness, 150);
    assertClose(hardcover150.depth, hardcover150.baseDepth * 1.5);
    await page.fill('#thickness-input', '200');
    await page.locator('#thickness-input').press('Enter');
    await page.evaluate(() => waitForTextures());
    assertClose((await measureThickness()).depth, thicknessOriginal.baseDepth * 2, 'Numeric changes must not compound');

    await page.evaluate(async () => { await applyCover(fullImageData); });
    await page.evaluate(() => waitForTextures());
    const afterReapply = await measureThickness();
    assert.equal(afterReapply.thickness, 200);
    assertClose(afterReapply.depth, thicknessOriginal.baseDepth * 2, 'Reapplying the same cover must preserve the factor');
    assertClose(afterReapply.pageBlockZ, hardcoverThick.pageBlockZ, 'Reapplying the same cover must not compound the page block');
    assert.equal(afterReapply.fullImageData, thicknessOriginal.fullImageData);

    await page.click('[data-type="paperback"]');
    await page.evaluate(() => waitForTextures());
    const paperbackThick = await measureThickness();
    assert.equal(paperbackThick.type, 'paperback');
    assert.equal(paperbackThick.thickness, 200);
    assertClose(paperbackThick.depth, paperbackThick.baseDepth * 2);
    assertClose(paperbackThick.boundsZ, paperbackOriginal.boundsZ * 2);
    assert.equal(paperbackThick.width, paperbackOriginal.width);
    assert.equal(paperbackThick.height, paperbackOriginal.height);
    assert.deepEqual(paperbackThick.images, paperbackOriginal.images);
    assert.deepEqual(paperbackThick.crop, paperbackOriginal.crop);
    assert.deepEqual(paperbackThick.camera, paperbackOriginal.camera);
    assert.equal(paperbackThick.depthMeta, (paperbackThick.depth / paperbackThick.width * 100).toFixed(1) + '%');
    await page.screenshot({ path: path.join(output, 'thickness-paperback.png'), animations: 'disabled' });
    assert.notDeepEqual(await canvas.screenshot(), paperbackOriginalPixels, '200% paperback thickness must change preview pixels');
    assert.notEqual(await page.evaluate(() => getExportDataURL('png', 1024)), paperbackOriginalExport, 'Paperback export must reflect thickness');

    await page.click('[data-type="hardcover"]');
    await page.evaluate(() => waitForTextures());
    assert.equal((await measureThickness()).thickness, 200, 'Type switching must retain thickness');
    await page.fill('#thickness-input', '400'); await page.locator('#thickness-input').press('Enter');
    assert.equal(await page.inputValue('#thickness-input'), '300');
    await page.fill('#thickness-input', '1'); await page.locator('#thickness-input').press('Enter');
    assert.equal(await page.inputValue('#thickness-input'), '50');
    await page.click('#thickness-reset');
    await page.evaluate(() => waitForTextures());
    const thicknessReset = await measureThickness();
    assert.equal(thicknessReset.thickness, 100);
    assertClose(thicknessReset.depth, thicknessReset.baseDepth);
    assert.equal(thicknessReset.depthMeta, (thicknessReset.depth / thicknessReset.width * 100).toFixed(1) + '%');
    console.log('Spine thickness: exact scaling, crop/image/camera preservation, type/reapply retention, clamp/reset and exports OK');

    // Spine shadow is a session-only vertex tint. It must rebuild the named
    // spine without changing geometry, source/crop data, framing or camera.
    const spineShadowRead = () => page.evaluate(() => {
      const spine = bookGroup.getObjectByName('paperback-spine') || bookGroup.getObjectByName('hardcover-spine');
      if (!spine) throw new Error('The active book must expose a named spine mesh');
      const geometry = spine.geometry;
      geometry.computeBoundingBox();
      const box = new THREE.Box3().setFromObject(spine);
      const bookBox = new THREE.Box3().setFromObject(bookGroup);
      const uv = geometry.attributes.uv;
      const color = geometry.attributes.color;
      const samples = { edge: null, center: null };
      if (color && uv) for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i), rgb = [color.getX(i), color.getY(i), color.getZ(i)];
        if (Math.abs(u - .5) < 1e-9) samples.center = rgb;
        if ((Math.abs(u) < 1e-9 || Math.abs(u - 1) < 1e-9) && !samples.edge) samples.edge = rgb;
      }
      return {
        enabled: spineShadowEnabled,
        thickness: spineThicknessPercent,
        type: bookType,
        name: spine.name,
        geometry: {
          positionCount: geometry.attributes.position.count,
          uvCount: uv ? uv.count : 0,
          colorCount: color ? color.count : 0,
          width: geometry.boundingBox.max.x - geometry.boundingBox.min.x,
          height: geometry.boundingBox.max.y - geometry.boundingBox.min.y
        },
        vertexColors: spine.material.vertexColors,
        texture: spine.material.map ? {
          minFilter: spine.material.map.minFilter,
          magFilter: spine.material.map.magFilter,
          generateMipmaps: spine.material.map.generateMipmaps
        } : null,
        samples,
        spineBounds: [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z],
        bookBounds: [bookBox.min.x, bookBox.min.y, bookBox.min.z, bookBox.max.x, bookBox.max.y, bookBox.max.z],
        images: { back: images.back, spine: images.spine, cover: images.cover },
        crop: { spineLeft, spineRight, cropLeft, cropRight, flapCropEnabled },
        size: { ...bookSize },
        camera: currentView()
      };
    });
    const spineShadowToggle = page.locator('#spine-shadow-toggle');
    assert.equal(await spineShadowToggle.count(), 1, 'Spine shadow checkbox must exist');
    assert.equal(await page.locator('label[for="spine-shadow-toggle"]').count(), 1, 'Spine shadow checkbox must have a label');
    const spineShadowStart = await spineShadowRead();
    assert.equal(spineShadowStart.enabled, false, 'Spine shadow defaults off');
    assert.equal(await spineShadowToggle.isChecked(), false);
    const spineShadowOriginalView = spineShadowStart.camera;
    const spineShadowOriginalThickness = spineShadowStart;
    for (const type of ['hardcover', 'paperback']) {
      await page.click(`[data-type="${type}"]`);
      await page.evaluate(() => waitForTextures());
      const disabledState = await spineShadowRead();
      assert.equal(await spineShadowToggle.isChecked(), false);
      assert(disabledState.geometry.positionCount > 0);
      assert.equal(disabledState.geometry.colorCount, 0, `${type} disabled spine must not use vertex colors`);
      assert.equal(disabledState.vertexColors, false);
      const disabledCanvas = await canvas.screenshot();
      const disabledExport = await page.evaluate(() => getExportDataURL('png', 1024));
      const disabledJpg = await page.evaluate(() => getExportDataURL('jpg', 1024));

      if (type === 'hardcover') await spineShadowToggle.press('Space');
      else await page.locator('label[for="spine-shadow-toggle"]').click();
      await page.evaluate(() => waitForTextures());
      const enabledState = await spineShadowRead();
      assert.equal(enabledState.enabled, true);
      assert.equal(await spineShadowToggle.isChecked(), true);
      assert.equal(enabledState.geometry.positionCount, 66, `${type} enabled spine must use 32x1 PlaneGeometry`);
      assert.equal(enabledState.geometry.uvCount, 66);
      assert.equal(enabledState.geometry.colorCount, 66);
      assert.equal(enabledState.vertexColors, true);
      assert.equal(enabledState.geometry.width, disabledState.geometry.width);
      assert.equal(enabledState.geometry.height, disabledState.geometry.height);
      assert.deepEqual(enabledState.texture, disabledState.texture, `${type} shadow must preserve spine texture filtering`);
      assert.deepEqual(enabledState.spineBounds, disabledState.spineBounds, `${type} tint must not change spine bounds`);
      assert.deepEqual(enabledState.bookBounds, disabledState.bookBounds, `${type} tint must not change book bounds`);
      assert.deepEqual(enabledState.images, disabledState.images);
      assert.deepEqual(enabledState.crop, disabledState.crop);
      assert.deepEqual(enabledState.size, disabledState.size);
      assert.deepEqual(enabledState.camera, disabledState.camera);
      for (const [name, expected] of [['center', 1], ['edge', .78]]) {
        assert(enabledState.samples[name], `${type} must have ${name} vertex tint sample`);
        enabledState.samples[name].forEach(channel => assert(Math.abs(channel - expected) < 1e-6, `${type} ${name} tint must be ${expected}`));
      }
      const enabledCanvas = await canvas.screenshot();
      const enabledExport = await page.evaluate(() => getExportDataURL('png', 1024));
      assert.notDeepEqual(enabledCanvas, disabledCanvas, `${type} shadow must change preview pixels`);
      assert.notEqual(enabledExport, disabledExport, `${type} shadow must change PNG pixels`);
      assert.notEqual(await page.evaluate(() => getExportDataURL('jpg', 1024)), disabledJpg, `${type} shadow must change JPG pixels`);
      fs.writeFileSync(path.join(output, `spine-shadow-${type}-off.png`), Buffer.from(disabledExport.split(',')[1], 'base64'));
      fs.writeFileSync(path.join(output, `spine-shadow-${type}-on.png`), Buffer.from(enabledExport.split(',')[1], 'base64'));
      await page.screenshot({ path: path.join(output, `spine-shadow-${type}-desktop.png`), animations: 'disabled' });
      await spineShadowToggle.uncheck(); await page.evaluate(() => waitForTextures());
      assert.equal(await page.evaluate(() => getExportDataURL('png', 1024)), disabledExport, `${type} toggling off must reproduce its original PNG`);
      assert.equal(await page.evaluate(() => getExportDataURL('jpg', 1024)), disabledJpg, `${type} toggling off must reproduce its original JPG`);
      await spineShadowToggle.check(); await page.evaluate(() => waitForTextures());

      // Rebuilds caused by thickness, cover reapply and type changes keep the flag.
      await page.locator('#thickness-slider').evaluate(el => { el.value = '125'; el.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.evaluate(() => waitForTextures());
      assert.equal((await spineShadowRead()).enabled, true);
      await page.click('#thickness-reset'); await page.evaluate(() => waitForTextures());
      await page.evaluate(async () => { await applyCover(fullImageData); });
      await page.evaluate(() => waitForTextures());
      assert.equal((await spineShadowRead()).enabled, true);
      if (type === 'hardcover') {
        const cropBeforeShadow = await page.evaluate(() => ({ spineLeft, spineRight, cropLeft, cropRight, flapCropEnabled }));
        await page.click('[data-step="cover"].step-tab'); await page.click('#edit-crop-btn');
        if (!cropBeforeShadow.flapCropEnabled) await page.check('#modal-flap-crop-toggle');
        await page.fill('#crop-left-input', String(Math.min(10, cropBeforeShadow.cropLeft + 1)));
        await page.locator('#crop-left-input').press('Tab');
        await page.click('#spine-confirm-btn');
        await page.waitForFunction(() => !document.getElementById('spine-modal').classList.contains('open'));
        assert.equal((await spineShadowRead()).enabled, true, 'Crop rebuild must retain spine shadow');
        await page.click('[data-step="cover"].step-tab');
        await page.click('#edit-crop-btn');
        await page.check('#modal-flap-crop-toggle');
        await page.fill('#crop-left-input', String(cropBeforeShadow.cropLeft));
        await page.locator('#crop-left-input').press('Tab');
        if (!cropBeforeShadow.flapCropEnabled) await page.uncheck('#modal-flap-crop-toggle');
        await page.click('#spine-confirm-btn');
        await page.waitForFunction(() => !document.getElementById('spine-modal').classList.contains('open'));
        assert.deepEqual((await spineShadowRead()).crop, cropBeforeShadow, 'Crop restore must preserve source boundaries');
        await page.click('[data-step="structure"].step-tab');
      }

      const enabledAfterRebuild = await page.evaluate(() => getExportDataURL('png', 1024));
      await spineShadowToggle.click();
      await page.evaluate(() => waitForTextures());
      assert.equal((await spineShadowRead()).enabled, false);
      const rebuiltDisabledExport = await page.evaluate(() => getExportDataURL('png', 1024));
      assert.notEqual(rebuiltDisabledExport, enabledAfterRebuild, `${type} off state must remove the shadow from PNG`);
      await spineShadowToggle.click(); await page.evaluate(() => waitForTextures());
      const enabledAgain = await page.evaluate(() => getExportDataURL('png', 1024));
      assert.notEqual(enabledAgain, rebuiltDisabledExport, `${type} on state must affect PNG after rebuild`);
      await spineShadowToggle.click(); await page.evaluate(() => waitForTextures());
      assert.equal(await page.evaluate(() => getExportDataURL('png', 1024)), rebuiltDisabledExport, `${type} off state must exactly restore its disabled PNG`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('.step-tab[data-step="structure"]');
    assert(await spineShadowToggle.isVisible(), 'Spine shadow toggle must be visible on mobile');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Spine shadow control must not overflow mobile');
    await page.screenshot({ path: path.join(output, 'spine-shadow-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.click(`[data-type="${spineShadowStart.type}"]`); await page.evaluate(() => waitForTextures());
    await page.evaluate(view => setCameraValues(view, false, true), spineShadowOriginalView);
    assert.equal(await page.evaluate(() => localStorage.getItem('spineShadowEnabled')), null, 'Spine shadow must not persist in localStorage');
    assert.deepEqual(await page.evaluate(() => currentView()), spineShadowOriginalView, 'Spine shadow must not change camera');
    assert.equal((await spineShadowRead()).thickness, spineShadowOriginalThickness.thickness, 'Spine shadow must restore thickness');
    assert.equal(await spineShadowToggle.isChecked(), false, 'Original disabled state must be restored before perspective tests');
    const restarted = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await restarted.goto(url); await restarted.click('#test-btn');
    await restarted.waitForFunction(() => document.getElementById('spine-preview-img').naturalWidth > 0);
    await restarted.click('#spine-confirm-btn');
    await restarted.waitForFunction(() => !document.getElementById('spine-modal').classList.contains('open'));
    assert.equal(await restarted.locator('#spine-shadow-toggle').isChecked(), false, 'Restart must leave spine shadow unchecked');
    assert.equal(await restarted.evaluate(() => spineShadowEnabled), false);
    await restarted.close();
    console.log('Spine shadow: accessible toggle, bounded centered tint, rebuild/session retention, exact off restore, PNG/screenshots and restart default OK');

    await page.click('.step-tab[data-step="view"]');
    const projectionOriginal = await page.evaluate(() => currentView());
    await page.evaluate(() => setCameraValues({ height: 1.25 }));
    const projectionBook = await page.evaluate(() => ({ size: { ...bookSize }, images: { ...images }, spineLeft, spineRight, spineThicknessPercent, uuid: bookGroup.uuid }));
    await page.locator('#fov-slider').focus(); await page.locator('#fov-slider').press('Home');
    assert.equal(await page.inputValue('#fov-input'), '10');
    const flatProjection = await page.evaluate(() => getExportDataURL('png', 1024));
    fs.writeFileSync(path.join(output, 'perspective-flat.png'), Buffer.from(flatProjection.split(',')[1], 'base64'));
    await page.locator('#fov-slider').press('End');
    assert.equal(await page.inputValue('#fov-input'), '70');
    const strongProjection = await page.evaluate(() => getExportDataURL('png', 1024));
    fs.writeFileSync(path.join(output, 'perspective-strong.png'), Buffer.from(strongProjection.split(',')[1], 'base64'));
    assert.notEqual(flatProjection, strongProjection, 'FOV must change actual output pixels');
    await page.fill('#vanishX-input', '30'); await page.locator('#vanishX-input').press('Enter');
    await page.fill('#vanishY-input', '-20'); await page.locator('#vanishY-input').press('Enter');
    const shiftedProjection = await page.evaluate(() => getExportDataURL('png', 1024));
    fs.writeFileSync(path.join(output, 'perspective-shifted.png'), Buffer.from(shiftedProjection.split(',')[1], 'base64'));
    assert.notEqual(strongProjection, shiftedProjection, 'Lens shift must change the depth projection');
    for (const data of [flatProjection, strongProjection, shiftedProjection]) {
      const bounds = await page.evaluate(async data => {
        const image = await decodeImage(data), c = document.createElement('canvas');
        c.width = c.height = 1024;
        const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, 1024, 1024).data;
        let count = 0, minX = 1024, minY = 1024, maxX = 0, maxY = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 240) {
          const n = (i - 3) / 4, x = n % 1024, y = Math.floor(n / 1024);
          count++; minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
        return { count, minX, minY, maxX, maxY };
      }, data);
      assert(bounds.count > 100000, 'Perspective output must be nonblank');
      assert(bounds.minX > 0 && bounds.minY > 0 && bounds.maxX < 1023 && bounds.maxY < 1023, 'Projection controls must keep the whole book framed');
    }
    assert.deepEqual(await page.evaluate(() => ({ size: { ...bookSize }, images: { ...images }, spineLeft, spineRight, spineThicknessPercent, uuid: bookGroup.uuid })), projectionBook);
    const assertProjection = async () => {
      const state = await page.evaluate(() => {
        const center = new THREE.Vector3().project(camera);
        return { fov: camera.fov, x: vanishX, y: vanishY, center: [center.x, center.y] };
      });
      assert.equal(state.fov, 70); assert.equal(state.x, 30); assert.equal(state.y, -20);
      assert.equal(await page.evaluate(() => cameraHeight), 1.25, 'Automatic retreat must preserve camera height');
      assert(state.center.every(n => Math.abs(n) < 1e-9), 'Book origin stays centered');
    };
    await assertProjection();
    const beforeProjectionExport = await page.evaluate(() => camera.projectionMatrix.toArray());
    await page.evaluate(() => getExportDataURL('jpg', 2560));
    assert.deepEqual(await page.evaluate(() => camera.projectionMatrix.toArray()), beforeProjectionExport, 'Export restores off-axis projection');
    for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#fov-input').scrollIntoViewIfNeeded();
      await assertProjection();
      await page.evaluate(() => { document.getElementById('toast').style.display = 'none'; });
      await page.screenshot({ path: path.join(output, 'perspective-controls-' + viewport.width + '.png'), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert(await page.locator('#vanishY-slider').isVisible());
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.fill('#fov-input', '100'); await page.locator('#fov-input').press('Enter');
    assert.equal(await page.inputValue('#fov-input'), '70');
    await page.fill('#vanishX-input', '99'); await page.locator('#vanishX-input').press('Enter');
    assert.equal(await page.inputValue('#vanishX-input'), '40');
    await page.click('#fit-btn');
    const fitted = await page.evaluate(() => {
      const sphere = new THREE.Box3().setFromObject(bookGroup).getBoundingSphere(new THREE.Sphere());
      const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      return frustum.planes.every(plane => plane.distanceToPoint(sphere.center) >= sphere.radius);
    });
    assert(fitted, 'Fit must account for shifted, strong perspective');
    const beforeReset = await page.evaluate(() => currentView());
    await page.click('#projection-reset');
    assert.deepEqual(await page.evaluate(() => currentView()), { ...beforeReset, fov: 35, vanishX: 0, vanishY: 0 });
    await page.evaluate(view => setCameraValues(view, false, true), projectionOriginal);
    console.log('Perspective: FOV/vanishing-point pixels, stable center, geometry preservation, resize/export/fit and reset OK');

    const baseline = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await baseline.goto(url + '/baseline');
    await baseline.click('#test-btn');
    await baseline.waitForFunction(() => document.getElementById('spine-preview-img').naturalWidth > 0);
    await baseline.click('#spine-confirm-btn');
    await baseline.waitForFunction(() => document.getElementById('export-single-btn').disabled === false);
    await baseline.click('[data-type="hardcover"]');
    await baseline.waitForTimeout(250);
    await baseline.screenshot({ path: path.join(output, 'hardcover-before.png') });
    await baseline.evaluate(() => { rotY = 35; cameraHeight = 6; updateCamera(); });
    const oldExport = await baseline.evaluate(() => getExportDataURL('png', 1024));
    fs.writeFileSync(path.join(output, 'hardcover-top-before.png'), Buffer.from(oldExport.split(',')[1], 'base64'));
    await baseline.close();

    await page.click('[data-step="cover"].step-tab');
    await page.click('#edit-crop-btn');
    const before = await page.evaluate(() => ({ spineLeft, spineRight, cropLeft, cropRight, flapCropEnabled, fullImageData, imageName }));
    await page.check('#modal-flap-crop-toggle');
    await page.fill('#crop-left-input', '5'); await page.locator('#crop-left-input').press('Tab');
    await page.fill('#crop-spine-left-input', '45'); await page.locator('#crop-spine-left-input').press('Tab');
    await page.click('#spine-cancel-btn');
    assert.deepEqual(await page.evaluate(() => ({ spineLeft, spineRight, cropLeft, cropRight, flapCropEnabled, fullImageData, imageName })), before);
    console.log('Crop cancel restores committed image and boundaries OK');

    await page.click('#edit-crop-btn');
    await page.check('#modal-flap-crop-toggle');
    await page.fill('#crop-left-input', '5'); await page.locator('#crop-left-input').press('Tab');
    await page.fill('#crop-right-input', '95'); await page.locator('#crop-right-input').press('Tab');
    await page.click('#spine-confirm-btn');
    await page.waitForFunction(() => !document.getElementById('spine-modal').classList.contains('open'));
    await page.click('[data-step="cover"].step-tab');
    await page.click('#edit-crop-btn');
    assert.equal(await page.inputValue('#crop-left-input'), '5.0');
    assert.equal(await page.inputValue('#crop-right-input'), '95.0');
    await page.uncheck('#modal-flap-crop-toggle');
    await page.check('#modal-flap-crop-toggle');
    assert.equal(await page.inputValue('#crop-left-input'), '5.0');
    const handle = await page.locator('#spine-line-left').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down(); await page.mouse.move(handle.x + 30, handle.y + handle.height / 2); await page.mouse.up();
    assert.notEqual(Number(await page.inputValue('#crop-spine-left-input')), before.spineLeft);
    await page.keyboard.press('Escape');
    console.log('Crop reopen, toggle memory and pointer drag OK');

    const originalImage = await page.evaluate(() => fullImageData);
    const originalBook = await page.evaluate(() => bookGroup.uuid);
    await page.evaluate(async () => {
      const img = images.cover;
      const blob = await (await fetch(img)).blob();
      await handleFile(new File([blob], 'replacement.png', { type: 'image/png' }));
    });
    await page.click('#spine-cancel-btn');
    assert.equal(await page.evaluate(() => fullImageData), originalImage);
    assert.equal(await page.evaluate(() => bookGroup.uuid), originalBook);
    console.log('Cancelling a new image import preserves the rendered book OK');
    await page.evaluate(() => handleFile(new File(['not an image'], 'broken.png', { type: 'image/png' })));
    assert.equal(await page.evaluate(() => fullImageData), originalImage);
    assert.match(await page.textContent('#status-text'), /损坏/);
    console.log('Invalid image keeps prior book OK');

    await page.evaluate(() => setCameraValues({ az: 9, el: 25, rotZ: 3, height: .5, zoom: 13, fov: 55, vanishX: 20, vanishY: -10 }));
    const originalView = await page.evaluate(() => currentView());
    await page.evaluate(() => {
      window.downloads = [];
      downloadDataURL = (data, name) => window.downloads.push({ name, dataLength: data.length });
      window.electronAPI = {
        saveFileDialog: async () => ({ canceled: true }),
        selectOutputFolder: async () => ({ canceled: true })
      };
    });
    await page.evaluate(() => exportSingle());
    assert.equal(await page.evaluate(() => window.downloads.length), 0);
    assert.match(await page.textContent('#status-text'), /取消/);
    await page.evaluate(() => {
      window.electronAPI = {
        selectOutputFolder: async () => ({ canceled: false, filePaths: ['test-output'] }),
        saveImageFile: async () => false
      };
    });
    await page.evaluate(() => exportAll());
    assert.match(await page.textContent('#status-text'), /失败/);
    assert.deepEqual(await page.evaluate(() => currentView()), originalView);
    await page.evaluate(() => { delete window.electronAPI; });
    await page.evaluate(() => exportAll());
    assert.equal(await page.evaluate(() => window.downloads.length), 4);
    assert.deepEqual(await page.evaluate(() => currentView()), originalView);
    await page.evaluate(() => setCameraValues({ fov: 35, vanishX: 0, vanishY: 0 }));
    console.log('Export cancel/failure/batch view restore OK');

    await page.evaluate(async () => { flapCropEnabled = false; await applyCover(fullImageData); });

    const captures = [];
    for (const [name, view] of [['front', { el: 0, az: 0, rotZ: 0, height: 0 }], ['spine25', { el: 25, height: 0 }], ['spine', { el: 90, height: 0 }], ['back', { el: 180, height: 0 }], ['top', { el: 35, height: 6 }], ['fore-edge', { el: -70, height: 6 }]]) {
      await page.evaluate(view => setCameraValues(view), view);
      await page.evaluate(() => waitForTextures());
      const data = await page.evaluate(() => getExportDataURL('png', 1024));
      fs.writeFileSync(path.join(output, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
      const pixels = await page.evaluate(async data => {
        const img = await decodeImage(data), c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let solid = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 240) solid++;
        return { width: img.width, height: img.height, solid, cornerAlpha: d[3] };
      }, data);
      assert.equal(pixels.width, 1024); assert.equal(pixels.height, 1024);
      assert(pixels.solid > 1000 && pixels.solid < 1024 * 1024 * .9);
      assert.equal(pixels.cornerAlpha, 0);
      if (name === 'front') {
        const color = await page.evaluate(async data => {
          const img = await decodeImage(data), c = document.createElement('canvas'); c.width = c.height = 1024;
          const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
          const p = new THREE.Vector3(bookSize.w * .3, bookSize.h * .35, bookSize.d / 2).project(camera);
          return [...ctx.getImageData(Math.round((p.x + 1) * 512), Math.round((1 - p.y) * 512), 1, 1).data];
        }, data);
        [74, 28, 107].forEach((expected, i) => assert(Math.abs(expected - color[i]) <= 2, 'sRGB cover color must match source'));
      }
      captures.push({ name, ...pixels });
    }
    const jpg = await page.evaluate(() => getExportDataURL('jpg', 1024));
    const corner = await page.evaluate(async data => {
      const img = await decodeImage(data), c = document.createElement('canvas'); c.width = c.height = 1024;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0); return [...ctx.getImageData(0, 0, 1, 1).data];
    }, jpg);
    assert.deepEqual(corner, [255, 255, 255, 255]);
    console.log('Six angles nonblank, PNG transparency, JPG white OK', JSON.stringify(captures));
    for (const size of [1920, 2560]) {
      const dimensions = await page.evaluate(async size => {
        const img = await decodeImage(await getExportDataURL('png', size)); return [img.width, img.height];
      }, size);
      assert.deepEqual(dimensions, [size, size]);
    }
    await page.click('.step-tab[data-step="structure"]');
    await page.click('[data-type="paperback"]');
    await page.evaluate(() => waitForTextures());
    assert.equal(await page.locator('#hardcover-controls').isVisible(), false);
    assert((await page.evaluate(() => getExportDataURL('png', 1024))).length > 2000);
    await page.click('[data-type="hardcover"]');
    await page.evaluate(() => waitForTextures());
    console.log('All export resolutions and paperback compatibility OK');

    await page.evaluate(async () => {
      for (let i = 0; i < 15; i++) { updateScene(); await waitForTextures(); }
    });
    const memory = await page.evaluate(() => renderer.info.memory);
    assert(memory.geometries < 20 && memory.textures < 12);
    console.log('Repeated rebuild GPU memory bounded', JSON.stringify(memory));

    await page.evaluate(() => {
      window.electronAPI = { saveFileDialog: () => new Promise(resolve => { window.finishDialog = resolve; }) };
      window.pendingExport = exportSingle();
    });
    assert(await page.locator('#board-input').isDisabled());
    assert(await page.locator('#thickness-slider').isDisabled());
    assert(await page.locator('#thickness-input').isDisabled());
    assert(await page.locator('#thickness-reset').isDisabled());
    assert(await page.locator('#fov-slider').isDisabled());
    assert(await page.locator('#vanishX-input').isDisabled());
    assert(await page.locator('#projection-reset').isDisabled());
    assert(await page.locator('#spine-shadow-toggle').isDisabled());
    assert(await page.locator('#file-input').isDisabled());
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.evaluate(async () => { window.finishDialog({ canceled: true }); await window.pendingExport; delete window.electronAPI; });
    assert.equal(await page.locator('#board-input').isDisabled(), false);
    const aspect = await page.evaluate(() => camera.aspect);
    assert.equal(aspect, 1);
    console.log('Export locks keyboard controls and survives dialog-time resize OK');

    for (const viewport of [{ width: 1440, height: 960 }, { width: 1100, height: 700 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const resizedPixels = await page.evaluate(() => {
        const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels.some((value, i) => i % 4 === 3 && value > 0);
      });
      assert(resizedPixels, 'Resize must leave a nonblank canvas');
      for (const step of ['cover', 'structure', 'view', 'export']) {
        await page.click(`.step-tab[data-step="${step}"]`);
        if (step === 'structure' && (viewport.width === 390 || viewport.width === 1440)) {
          assert(await page.locator('#thickness-slider').isVisible(), `${viewport.width} structure thickness control visible`);
          assert(await page.locator('#thickness-input').isVisible(), `${viewport.width} structure thickness input visible`);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${viewport.width} ${step} overflow`);
      }
      await page.screenshot({ path: path.join(output, `viewport-${viewport.width}.png`), fullPage: true });
    }
    const legacy = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    await legacy.goto(url);
    const legacyView = { az: 8, el: 22, rotZ: 2, zoom: 12, height: 1 };
    const legacyRaw = JSON.stringify({ version: 1, views: [{ id: 'custom-legacy', name: '旧版视角', view: legacyView }], selected: ['custom-legacy'] });
    await legacy.evaluate(raw => localStorage.setItem('book3d.camera-presets.v1', raw), legacyRaw);
    await legacy.reload(); await legacy.click('.step-tab[data-step="view"]');
    await legacy.click('.saved-view-row .preset-btn');
    assert.deepEqual(await legacy.evaluate(() => currentView()), { ...legacyView, fov: 35, vanishX: 0, vanishY: 0 });
    assert.equal(await legacy.evaluate(() => localStorage.getItem(viewStorageKey)), null, 'Legacy read must not rewrite storage');
    await legacy.click('.saved-view-row [data-action="rename"]');
    await legacy.fill('#view-name', '新版名称'); await legacy.click('#save-view-btn');
    assert.equal(await legacy.evaluate(() => localStorage.getItem('book3d.camera-presets.v1')), legacyRaw, 'Old app settings must remain untouched');
    assert.equal(await legacy.evaluate(() => JSON.parse(localStorage.getItem(viewStorageKey)).version), 2);
    await legacy.close();
    const custom = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    custom.on('pageerror', err => errors.push(err.message));
    await custom.goto(url);
    await custom.click('.step-tab[data-step="view"]');
    const savedCamera = { az: 7.25, el: 31.5, rotZ: -3.5, zoom: 13.25, height: 1.75, fov: 48, vanishX: 18, vanishY: -12 };
    await custom.evaluate(view => setCameraValues(view), savedCamera);
    await custom.fill('#view-name', '我的主图'); await custom.click('#save-view-btn');
    assert.equal(await custom.locator('.saved-view-row').count(), 1);
    assert.equal(await custom.textContent('#batch-count'), '5');
    await custom.fill('#view-name', ' 我的主图 '); await custom.click('#save-view-btn');
    assert.equal(await custom.locator('.saved-view-row').count(), 1);
    assert.match(await custom.textContent('#status-text'), /名称不能重复/);
    await custom.reload();
    await custom.click('.step-tab[data-step="view"]');
    await custom.click('.saved-view-row .preset-btn');
    assert.deepEqual(await custom.evaluate(() => currentView()), savedCamera);
    await custom.click('.saved-view-row [data-action="rename"]');
    await custom.fill('#view-name', '主图 / 31°'); await custom.click('#save-view-btn');
    assert.equal(await custom.textContent('.saved-view-row .preset-btn'), '主图 / 31°');
    assert.deepEqual(await custom.evaluate(() => savedViews[0].view), savedCamera, 'Rename must preserve camera');
    await custom.click('.saved-view-row [data-action="rename"]');
    await custom.click('#cancel-view-edit');
    assert.equal(await custom.inputValue('#view-name'), '');
    await custom.evaluate(() => setCameraValues({ el: 29 }));
    custom.once('dialog', dialog => dialog.accept());
    await custom.click('.saved-view-row [data-action="update"]');
    assert.equal(await custom.evaluate(() => document.activeElement.dataset.action), 'update', 'Updating must retain keyboard focus');
    const updated = { ...savedCamera, el: 29 };
    assert.deepEqual(await custom.evaluate(() => savedViews[0].view), updated);
    // Applying an exact saved view must survive a smaller cover's usual camera bounds.
    await custom.evaluate(() => { bookSize.h = 40; setCameraValues({ zoom: 80, height: 20 }); });
    await custom.fill('#view-name', '高开本'); await custom.click('#save-view-btn');
    await custom.evaluate(() => { bookSize.h = 5.66; setCameraValues({ zoom: 12, height: 0 }); });
    await custom.locator('.saved-view-row .preset-btn').nth(1).click();
    assert.deepEqual(await custom.evaluate(() => [cameraDistance, cameraHeight]), [80, 20]);
    custom.once('dialog', dialog => dialog.accept());
    await custom.locator('.saved-view-row [data-action="delete"]').nth(1).click();
    await custom.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { throw new DOMException('Storage full', 'QuotaExceededError'); };
    });
    await custom.fill('#view-name', '不会丢失原设置'); await custom.click('#save-view-btn');
    assert.equal(await custom.locator('.saved-view-row').count(), 1);
    assert.match(await custom.textContent('#view-storage-error'), /保存失败/);
    await custom.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });
    await custom.click('.step-tab[data-step="cover"]'); await custom.click('#test-btn');
    await custom.waitForFunction(() => document.getElementById('spine-preview-img').naturalWidth > 0);
    await custom.click('#spine-confirm-btn'); await custom.evaluate(() => waitForTextures());
    await custom.click('.step-tab[data-step="export"]');
    await custom.click('[data-batch="recommended"]');
    assert.equal(await custom.locator('#batch-view-list input:checked').count(), 6);
    const presetPixels = [];
    for (const kind of ['paperback', 'hardcover']) {
    await custom.evaluate(async kind => { bookType = kind; updateScene(); await waitForTextures(); }, kind);
    for (const btn of await custom.locator('.preset-grid .preset-btn').all()) {
      const id = await btn.getAttribute('data-id');
      await custom.evaluate(id => applyViewPreset(document.querySelector('.preset-btn[data-id="' + id + '"]')), id);
      const data = await custom.evaluate(() => getExportDataURL('png', 1024));
      fs.writeFileSync(path.join(output, 'preset-' + kind + '-' + id + '.png'), Buffer.from(data.split(',')[1], 'base64'));
      const bounds = await custom.evaluate(async data => {
        const image = await decodeImage(data), c = document.createElement('canvas'); c.width = c.height = 1024;
        const ctx = c.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, 1024, 1024).data;
        let count = 0, minX = 1024, minY = 1024, maxX = 0, maxY = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 240) {
          const n = (i - 3) / 4, x = n % 1024, y = Math.floor(n / 1024);
          count++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
        return { count, minX, minY, maxX, maxY };
      }, data);
      assert(bounds.count > 120000, id + ' must be readable and nonblank');
      assert(bounds.minX > 15 && bounds.minY > 15 && bounds.maxX < 1008 && bounds.maxY < 1008, id + ' must not clip');
      presetPixels.push({ kind, id, ...bounds });
    }
    }
    await custom.click('[data-batch="custom"]');
    await custom.check('#batch-view-list input[data-view-id="front"]');
    await custom.evaluate(() => {
      window.exportedViews = [];
      downloadDataURL = (data, name) => window.exportedViews.push({ name, view: currentView(), dataLength: data.length });
    });
    const beforeBatch = await custom.evaluate(() => currentView());
    await custom.evaluate(() => exportAll());
    const exported = await custom.evaluate(() => window.exportedViews);
    assert.equal(exported.length, 2);
    assert.deepEqual(exported[1].view, updated);
    assert(!/[\\/:*?"<>|]/.test(exported[1].name), 'Saved view names must not create unsafe filenames');
    assert(exported.every(a => a.dataLength > 2000));
    assert.deepEqual(await custom.evaluate(() => currentView()), beforeBatch);
    const checkedIds = await custom.locator('#batch-view-list input:checked').evaluateAll(inputs => inputs.map(input => input.dataset.viewId));
    for (const id of checkedIds) await custom.locator('#batch-view-list input[data-view-id="' + id + '"]').uncheck();
    assert(await custom.locator('#export-all-btn').isDisabled());
    await custom.reload();
    assert.equal(await custom.textContent('#batch-count'), '0', 'Empty selection must persist');
    await custom.click('.step-tab[data-step="cover"]'); await custom.click('#test-btn');
    await custom.waitForFunction(() => document.getElementById('spine-preview-img').naturalWidth > 0);
    await custom.click('#spine-confirm-btn'); await custom.evaluate(() => waitForTextures());
    await custom.click('[data-type="hardcover"]'); await custom.evaluate(() => waitForTextures());
    await custom.click('.step-tab[data-step="view"]');
    custom.once('dialog', dialog => dialog.dismiss());
    await custom.click('.saved-view-row [data-action="delete"]');
    assert.equal(await custom.locator('.saved-view-row').count(), 1);
    for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }]) {
      await custom.setViewportSize(viewport);
      await custom.evaluate(() => { document.getElementById('toast').style.display = 'none'; });
      await custom.screenshot({ path: path.join(output, 'saved-views-' + viewport.width + '.png'), fullPage: true });
      assert.equal(await custom.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await custom.click('.step-tab[data-step="export"]');
      await custom.screenshot({ path: path.join(output, 'batch-views-' + viewport.width + '.png'), fullPage: true });
      assert.equal(await custom.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await custom.click('.step-tab[data-step="view"]');
    }
    custom.once('dialog', dialog => dialog.accept());
    await custom.click('.saved-view-row [data-action="delete"]');
    assert.equal(await custom.locator('.saved-view-row').count(), 0);
    await custom.evaluate(() => localStorage.setItem(viewStorageKey, '{broken'));
    await custom.reload();
    await custom.click('.step-tab[data-step="view"]');
    assert.match(await custom.textContent('#view-storage-error'), /原数据已保留/);
    assert.equal(await custom.evaluate(() => localStorage.getItem(viewStorageKey)), '{broken');
    assert(await custom.locator('#save-view-btn').isDisabled());
    await custom.close();
    console.log('Saved views: exact apply/reload/update/rename/delete, safe mixed batch, empty selection, storage failures OK');
    console.log('Product preset framing', JSON.stringify(presetPixels));
    assert.deepEqual(errors, []);
    console.log('Desktop, small desktop and mobile layout; no page errors OK');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(err => { console.error(err); server.close(); process.exitCode = 1; });
