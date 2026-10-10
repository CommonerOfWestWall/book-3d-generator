# Hardcover And Workflow Implementation Plan

Goal: Produce a geometrically consistent closed hardcover mockup, and make cropping,
structure adjustment, preview and export reliable. Keep Tauri 2 and Electron compatible.

Assumptions: A horizontal spread is back / spine / front (optional outer flaps).
This task covers closed flat-spine hardcover books, not open books or rounded spines.
No GitHub push, release or dependency upgrade is included without a new request.

## Confirmed Problems
- Transparent board edges, shortened boards, mismatched page/board centers.
- Texture loading is asynchronous but export does not wait for it.
- Rebuilds leak GPU resources; each export creates another renderer.
- Crop modal cannot reopen; cancel mutates the previous image/selection.
- Native export cancellation triggers a browser download; batch leaves view changed.
- README describes missing open-book and gradient features and reverses spread order.

## Files And Ownership
- renderer/book-model.js, tests/book-model.test.cjs: delegated geometry and its tests.
- renderer/index.html: crop transaction, preview, structure controls and export lifecycle.
- renderer/ui.css: responsive work-focused layout and accessibility states.
- renderer/icons.js: bundled subset of existing Lucide icons, no new dependency.
- tests/workflow.test.cjs: browser regression checks and canvas evidence.
- README.md: accurate bilingual workflow/build instructions and limitations.
- package.json: test script only. Preserve version 1.1.0 until release is requested.

## Milestones
- [x] Locate relocated repository and inspect current model/workflow.
- [x] Replace hardcover shell with opaque boards, closed spine and inset page block.
- [x] Add board thickness/overhang controls; preserve front-cover aspect ratio.
- [x] Add transactional, reopenable crop editor with numeric and pointer controls.
- [x] Organize interface, match square preview to square exports, responsive layout.
- [x] Wait for textures, dispose rebuilt assets, handle export errors/cancel/restore.
- [x] Run geometry tests, browser workflows, multi-angle screenshots and pixel checks.
- [x] Run Tauri release build; place deliverables in the thread outputs directory.
- [x] Refresh bilingual documentation and report verified results/remaining limits.

## Observable Acceptance
Boards enclose pages on front/back, page block lies within board edges, total depth
matches the selected spine. Textures are upright and not mirrored on all faces.
Cancel keeps the previous image/crop; reopening preserves crop; all four handles work.
Failed/cancelled exports do not report success; batch restores the original view.
Desktop and narrow view have no horizontal overflow or covered controls. PNG has
transparent background, JPG white; exports are nonblank and square at selected size.
No source/image/Git changes are silently overwritten. No network is needed at runtime.

## Verification Evidence
- npm test: 8 tests pass against the actual vendored Three.js r128 runtime.
- npm run test:ui: upload/cancel/reopen, numeric/pointer editing, structure controls,
  paperback compatibility, PNG/JPG, all three resolutions, six camera angles,
  sRGB pixel match, keyboard lock, batch cancel/failure/restore and viewport checks pass.
- Viewports: 1440x960, 1100x700, 390x844; nonblank canvas after resize, no overflow.
- After 15 rebuilds: 5 geometries, 5 textures; no renderer/page errors.
- Tauri release executable and NSIS installer built. Relocated stale Cargo permission
  paths required cleaning only Tauri-related generated package artifacts.
- Native WebView2 smoke: file input import, crop confirmation, hardcover preview,
  actual Rust save_image_file creates a valid 1920x1920 PNG; malformed data rejects.
- PE subsystem remains Windows GUI (2); release console suppression is preserved.
- OS save-dialog cancellation is covered with bridge mocks, not native UI automation.
  Installer installation and Electron packaging were not exercised. No GitHub publish.
- The previously supplied cover path no longer exists; screenshots use the bundled
  labeled example spread. Photographic realism on the user's specific book remains
  subject to checking that cover and the intended binding style.
