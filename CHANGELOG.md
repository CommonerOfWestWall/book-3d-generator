# Changelog / 更新日志

## 1.3.0 - 2026-10-12

**状态 / Status:** 稳定版 / Stable release

### 中文

- 程序、源码和发布版本统一为 `1.3.0`；[GitHub v1.3.0](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.3.0) 提供 Windows x64 EXE、NSIS 安装包与 SHA-256 校验文件，旧版发布记录保留。
- 新增书厚会话调整：范围 `50%`–`300%`，步长 `5%`，默认 `100%`；支持闭合平装和闭合平直书脊精装，保存视角不记录书厚，重启恢复默认值。
- 新增透视控制：FOV `10`–`70`、默认 `35`；水平/垂直消失点偏移 `-40`–`40`、默认 `0/0`；自动退远保持旋转和高度不变。
- 保存视角统一为 8 个字段（`az`、`el`、`rotZ`、`zoom`、`height`、`fov`、`vanishX`、`vanishY`）；旧版 5 字段记录补默认投影值，v2 只在新版存储键缺失时读取 v1，且不覆盖旧存储。内置视角重置为 `35/0/0`，批量导出恢复全部 8 个字段。
- 新增精确标签 `书脊淡阴影`：默认关闭，使用中心原色、边缘较暗的顶点色调；适用于两种书型、预览、PNG/JPG 单张导出和批量导出，不模糊或改动源图。阴影与书厚均为会话状态。

### English

- Unified application, source and release versions at `1.3.0`; [GitHub v1.3.0](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.3.0) provides Windows x64 EXE, NSIS installer and SHA-256 checksums. Previous releases are retained.
- Added session-only thickness control from `50%` to `300%` in `5%` steps, default `100%`, for both closed paperback and closed flat-spine hardcover. Saved views do not include thickness; restart restores the default.
- Added perspective controls: FOV `10`–`70`, default `35`; horizontal and vertical vanishing-point offsets `-40`–`40`, default `0/0`; automatic retreat preserves rotation and height.
- Saved views now use eight fields (`az`, `el`, `rotZ`, `zoom`, `height`, `fov`, `vanishX`, `vanishY`). Legacy five-field records receive default projection values; v2 reads v1 only when the new storage key is absent and does not overwrite old storage. Built-in views reset to `35/0/0`, and batch export restores all eight fields.
- Added the exact `书脊淡阴影` checkbox label. It is off by default and applies a center-original, darker-edge vertex tint to both book types, PNG/JPG single export and batch export without blurring or changing source images. Shadow and thickness are session-only.

## 1.2.0 - 2026-10-10

### 中文

- 将程序、源码和发布版本统一为 `1.2.0`，[GitHub v1.2.0](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.2.0) 提供 Windows x64 独立 EXE、NSIS 安装包和 `SHA256SUMS.txt`。
- 增加 Tauri 2 轻量 Windows 桌面路径，正常启动不显示黑色控制台窗口；安装包在缺少 WebView2 时默认联网下载安装引导程序。
- 增加两端勒口裁切，修正闭合平直书脊精装的板厚、出飘、书脊接缝和页面内缩估算。
- 固定四个工作流标签：`封面`、`书型`、`视角`、`导出`，并强化裁切取消、导出准备检查、取消/失败后的视角恢复。
- 提供常用四张与推荐六张商品视角；支持命名保存五个相机字段（X/Y/Z、距离、高度）的视角，并支持应用、更新、重命名、删除。
- 支持内置视角和自定义视角混合选择的批量导出；加入 sRGB 纹理/导出处理和本地设置读写异常保护。
- 视角与批量选择按 `com.book3d.generator` 应用身份保存在当前 Windows 用户本地，不上传，也不承诺随程序文件夹或跨电脑迁移。

### English

- Unified application, source and release versions at `1.2.0`; the [GitHub v1.2.0 release page](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.2.0) provides Windows x64 standalone EXE, NSIS installer and `SHA256SUMS.txt` assets.
- Added a lightweight Tauri 2 Windows desktop path with no black console window during normal startup. The installer defaults to downloading the WebView2 bootstrapper when the runtime is missing.
- Added outer-flap cropping and corrected closed flat-spine hardcover estimates for board thickness, overhang, spine joint and page inset.
- Standardized four workflow tabs: `封面` (Cover), `书型` (Structure), `视角` (View) and `导出` (Export), with stronger crop cancellation, export-readiness checks and camera restoration after cancel or failure.
- Added common-four and recommended-six product-view sets; named saved views persist five camera fields (X/Y/Z, distance and height) with apply, update, rename and delete operations.
- Added mixed built-in/custom batch export, sRGB texture/export handling and robust local-settings read/write failure behavior.
- Views and batch selections persist locally for the current Windows user under application identity `com.book3d.generator`; they are not uploaded and are not promised to migrate with an app folder or between computers.

## History / 历史

- `1.1.0` existed in source metadata and was merged internally; it was not published as a separate GitHub release.
- `1.0` is the prior GitHub release and remains historical. It is not replaced or rewritten by this changelog.
