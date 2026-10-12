# Perspective Controls Implementation Plan

**Goal:** Local testing build with flatter/stronger perspective and movable lens vanishing point, compatible saved views and consistent exports.
**Architecture:** Existing Three.js r128 PerspectiveCamera. FOV changes compensate camera distance against the original 35-degree reference. Camera-plane translation plus off-axis frustum keeps the book center framed while shifting lens principal/vanishing point. Existing cover crop/thickness behavior remains untouched.
**Tech Stack:** Existing JavaScript/Three.js/Tauri; no new dependencies or GitHub publication.

## Scope And Defaults
- Renderer camera state/control/UI/export restore: fov 10..70 degrees (default35), vanishX/vanishY -40..40 percent (default0; positive right/up).
- renderer/book-camera.js: Three camera projection and sphere/frustum fitting.
- renderer/view-presets.js and unit tests: envelope2 writer, envelope1 reader defaults. New v2 storage key imports legacy v1 only when absent, keeping both versions' data independent.
- tests/book-camera.test.cjs, tests/workflow.cjs: projection math, actual pixels, resize/export, saved views, default/legacy compatibility, camera restore.
- README: bilingual local-build usage, lens vanishing point versus book-edge vanishing points, saved projection settings.
- Keep published1.2.0 assets and previous thickness preview unchanged; build new local EXE.

## Milestones
- [x] Implement and test camera/FOV/frustum math using vendored Three.js.
- [x] Add controls/reset, resize/export integration and saved-view compatibility.
- [x] Verify all unit/UI regressions, native Tauri camera persistence and actual PNG exports.
- [x] Build/copy local preview and report boundaries.

## Acceptance
- FOV10 looks flatter and FOV70 stronger without center-plane size jumps; default35/0/0 matches old camera.
- Lens vanishing point shifts genuinely affect depth projection, not merely canvas panning; model origin remains centered.
- Fit/default presets and square exports remain nonblank and correctly framed; resize preserves projection.
- Old5-field saved views decode to35/0/0; new8-field settings survive save/reload/update/batch/restart and restore after failure/cancel.
- Thickness, source artwork and crop remain unchanged. No network upload/release.

## Evidence / Progress
- 25 Node tests and expanded browser workflows passed. Default projection matches legacy matrices; FOV/shift/height/aspect corner cases and frustum sphere fitting pass.
- Screenshot inspection exposed strong-FOV clipping. Added a failing whole-book pixel-bound test, then a UI-only retreat guard preserving rotation/height; the check now passes.
- Revised storage isolation: seed v2 from v1 only if missing; writes never overwrite v1. Invalid v2 remains blocked rather than silently falling back to old data.
- Native Tauri/WebView2 checks passed with an isolated profile: full-process restart preserves exact custom projection, legacy storage remains unchanged, and Rust single/custom batch PNG exports match byte-for-byte. Existing thickness controls remain functional.
- Tauri release build passed. Delivered a separate book-3d-app-perspective-preview.exe with matching SHA256 and Windows GUI subsystem; previous preview/release files remain untouched. Version metadata stays 1.2.0 for local testing only; no commit, push or publication.
