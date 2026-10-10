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

    await page.evaluate(() => setCameraValues({ az: 9, el: 25, rotZ: 3, height: .5, zoom: 13 }));
    const originalView = await page.evaluate(() => [rotX, rotY, rotZ, cameraHeight, cameraDistance]);
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
    assert.deepEqual(await page.evaluate(() => [rotX, rotY, rotZ, cameraHeight, cameraDistance]), originalView);
    await page.evaluate(() => { delete window.electronAPI; });
    await page.evaluate(() => exportAll());
    assert.equal(await page.evaluate(() => window.downloads.length), 4);
    assert.deepEqual(await page.evaluate(() => [rotX, rotY, rotZ, cameraHeight, cameraDistance]), originalView);
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
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${viewport.width} ${step} overflow`);
      }
      await page.screenshot({ path: path.join(output, `viewport-${viewport.width}.png`), fullPage: true });
    }
    const custom = await browser.newPage({ viewport: { width: 1440, height: 960 } });
    custom.on('pageerror', err => errors.push(err.message));
    await custom.goto(url);
    await custom.click('.step-tab[data-step="view"]');
    const savedCamera = { az: 7.25, el: 31.5, rotZ: -3.5, zoom: 13.25, height: 1.75 };
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
