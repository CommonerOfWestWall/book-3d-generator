# Product views and saved camera settings

## Goal / 目标
Replace uncommon default product views after inspecting public book listings. Save named camera settings locally and batch-export selected built-in/custom views. Preserve existing hardcover, crop, image quality and export behavior.

## Assumptions / 假设
- Listing samples are qualitative references, not platform angle requirements. Exact rotation values are calibrated in this renderer.
- Custom views store exact X/Y/Z rotation, distance and height, independently of the cover image and background. Built-ins retain size-aware framing.
- No dependency upgrades, release version bump or Git push in this task.

## Files / 文件
renderer/index.html, ui.css, icons.js, view-presets.js; tests/view-presets.test.cjs and workflow.cjs; package.json; README.md; docs/product-views.md.

## Milestones / 里程碑
1. Inspect public listing images and document observed composition and access limits.
2. Add tested, versioned validation for saved views and filename safety.
3. Integrate save/apply/update/rename/delete and selectable batch export, with persistence/error states.
4. Verify browser flows, pixel output, responsive layout and native WebView2; build an unpublished executable and installer.

## Acceptance / 验收
- Four common and six recommended views show intentional readable framing.
- Saved views survive reload, preserve exact camera parameters, and can be selected for batch export.
- Zero selection disables batch export; cancellation/error restores the original camera and controls.
- Invalid storage does not crash or silently overwrite user data. Failed storage writes are reported.
- Unit/UI tests pass; real Tauri export succeeds; outputs and bilingual notes are delivered in the workspace outputs folder.

## Progress / 进度
- Completed public samples: Dangdang listing/gallery thumbnails, Books.com.tw boxed edition listing/gallery, Suning public product image; JD thumbnails and Amazon KDP front-thumbnail documentation are supplementary. Access limitations and sample scope are recorded in docs/product-views.md.
- Completed named save/apply/update/rename/delete, exact five-field storage, atomic writes, persistent batch selection, four/six/custom quick groups, mixed export and safe filenames.
- Focused review found focus loss after saved-row rebuild; corrected and regression-tested. Batch checkbox updates retain DOM/focus. Sidebar navigation remains reachable while scrolling.
- npm test: 15/15 pass. Browser workflow passes with 12 paperback/hardcover preset pixel/bounds checks, three export sizes, responsive screenshots, persistence, CRUD, storage errors and export restoration.
- Tauri release/NSIS build succeeds. Actual WebView2 test in an isolated profile confirms full process restart persistence; actual Rust custom batch PNG exactly matches single PNG bytes. PE subsystem 2 confirms GUI build.
- Native folder cancellation is mocked; installer installation and Electron packaging were not re-tested. No release version bump, commit or push was performed.
