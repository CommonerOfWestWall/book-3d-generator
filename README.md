# 立体书样机生成器 / Book 3D Generator
基础版本 / Base version: `1.1.0`。本次精装与流程优化尚未发布 / This hardcover and workflow update is not yet released.

## 中文
### 定位
Windows 桌面端的封面展开图 3D 样机工具。结果是近似展示用 mockup，不是印刷生产文件，也不替代印厂的出血、装订或纸张规格校验。

支持的模型只有：闭合平装、闭合平直书脊精装；不提供开书、圆脊或书衣模型。

输入是一张水平展开图，顺序为：
```text
[封底 / back] [书脊 / spine] [封面 / front]
```
两端可以带可选外勒口（outer flaps）。

### 工作流
界面分为四个标签页：`封面`、`书型`、`视角`、`导出`。

封面裁切弹窗支持数字输入和指针拖拽：红色书脊左/右边界，以及启用“裁切两端勒口”后的蓝色勒口左/右边界。`取消`、Esc 和关闭按钮会事务性取消本次修改，保留已提交图片与裁切；重新打开会恢复已提交值。

书脊宽度、封板厚度和出飘是按封面宽度百分比计算的几何估算，不是物理毫米值。封面宽高比保持原图比例；总深度根据选定书脊宽度估算。

### 预览与导出
- 预览为自适应正方形画布，与导出构图一致；导出边长为 `1024`、`1920` 或 `2560` 像素。
- PNG 可用透明或白色背景；JPG 使用白色背景。
- 常用四张为封面正视、封面微侧、书口微侧、封底正视；推荐六张另含封底微侧、斜俯展示。角度依据公开商品图抽样校准，不是平台强制标准，见 [视角参考与保存说明](docs/product-views.md)。
- “视角”页可命名保存当前 X/Y/Z 旋转、镜头距离和高度，支持应用、更新、重命名、删除；保存的数值不随封面尺寸自动缩放。
- “导出”页可勾选任意预设与已保存视角，或选择常用四张、推荐六张、我的视角；结束、失败或取消后恢复原视角。新保存的视角自动加入批量选择，空选择禁用批量导出。
- 视角和批量选择保存在当前用户的本地应用存储中，重启后保留，不上传到服务器；浏览器模式按网址保存。删除本地应用数据会丢失设置。存储读取异常时保留原数据并禁用修改，写入失败时保留原设置并提示错误。
- Electron/Tauri 原生保存或文件夹对话框取消会被尊重，不会偷偷改用浏览器下载。
- 无原生对话框时使用浏览器下载；批量下载可能需要允许多个文件下载。

### 运行与构建
需要 Windows x64、Node.js 和 npm：
```bash
npm ci
```
Tauri 2 需要 Rust、Windows MSVC 工具链以及系统已安装的 WebView2。WebView2 不随应用打包，所以程序体积较小；未签名构建可能显示 Windows 安全警告。不要通过关闭或禁用杀毒软件来处理该警告。
```bash
npm run tauri:dev
npm run tauri:build
```
Electron 入口仍保留：
```bash
npm start
npm run build
```
不要根据 README 推断下载文件名或“最新版本”；发布二进制和版本信息以实际发布记录为准。

### 开发与验证
```bash
npm test
npm run test:ui
```
`npm test` 使用 Node 内置测试运行几何与视角数据检查。`npm run test:ui` 使用外部 Playwright，并在可用时通过 Edge；若本机未解析到 Playwright，可按本机配置提供 `NODE_PATH`，不需要为此新增依赖。

目录要点：`renderer/index.html`（界面、Three.js 场景、裁切与导出运行时）、`renderer/book-model.js`（精装几何）、`renderer/three.min.js`（vendored Three.js r128）、`tests/`（Node 几何与浏览器工作流）、`src-tauri/`（Tauri 2 壳与原生文件操作）。仓库还声明了较新的 npm Three.js 依赖，但运行时继续使用 vendored r128；本任务不升级它。

### 参考资料
- [Bookmobile: How do you calculate the hardcover size?](https://info.bookmobile.com/knowledge/how-do-you-calculate-the-hardcover-size)
- [Three.js Texture documentation](https://threejs.org/docs/#api/en/textures/Texture)
- [Three.js Color documentation](https://threejs.org/docs/#api/en/math/Color)

MIT，见 [LICENSE](LICENSE)。

## English
### Scope
A Windows desktop tool for turning a flat cover spread into a 3D presentation mockup. It is an approximate mockup, not a print-production file, and does not replace a printer’s bleed, binding, or paper-spec checks.

Supported models: closed paperback and closed flat-spine hardcover only. There are no open-book, rounded-spine, or dust-jacket models.

The input is one horizontal spread in this order:
```text
[back] [spine] [front]
```
Optional outer flaps may be included at the two ends.

### Workflow
The UI has four tabs: `Cover`, `Structure`, `View`, and `Export`.

The crop dialog accepts numeric input and pointer dragging for the red spine-left/right handles and, when outer-flap cropping is enabled, the blue outer-flap handles. `Cancel`, Esc, and the close button transactionally discard the current edit and keep the committed image/crop; reopening preserves committed values.

Spine width, board thickness, and overhang are geometry estimates expressed as percentages of cover width, not physical millimetres. The exact cover aspect ratio is preserved; total depth is estimated from the selected spine width.

### Preview and export
- The responsive square preview matches the export framing; export dimensions are `1024`, `1920`, or `2560` pixels per side.
- PNG supports transparent or white backgrounds; JPG uses white.
- The common four views are straight front, front with spine, front with fore-edge, and straight back. The recommended six add back with spine and an oblique top view. These are calibrated from public listing samples, not platform requirements. See [view references and saved settings](docs/product-views.md).
- Name and save X/Y/Z rotation, camera distance and height in the View tab. Apply, update, rename and delete saved views. Custom camera values remain exact rather than scaling with a different cover.
- Select any combination of built-in and saved views for batch export, or choose common four, recommended six or all custom views. The original camera is restored after completion, failure or cancellation. New saved views are selected automatically; an empty selection disables batch export.
- Views and selections persist in the current user's local application storage without server uploads; browser storage is per origin. Clearing application data removes them. Invalid storage is retained without overwriting; failed writes report errors and keep previous settings.
- Native Electron/Tauri save or folder-dialog cancellation is honored; it does not silently fall back to a browser download.
- Without a native dialog, the browser download path is used; browsers may require permission for multiple batch downloads.

### Run and build
Requirements: Windows x64, Node.js, and npm.
```bash
npm ci
```
Tauri 2 requires Rust, the Windows MSVC toolchain, and WebView2 installed on the system. WebView2 is not bundled, keeping the application binary small; unsigned builds may show a Windows security warning. Do not disable antivirus software to handle that warning.
```bash
npm run tauri:dev
npm run tauri:build
```
The Electron path remains available:
```bash
npm start
npm run build
```
Do not infer a downloadable filename or “latest release” from this document; use the actual release record for published binaries and versions.

### Development and verification
```bash
npm test
npm run test:ui
```
`npm test` runs geometry and saved-view data checks with Node’s built-in test runner. `npm run test:ui` uses external Playwright and Edge when available; provide `NODE_PATH` according to the local setup if Playwright is not resolved. No dependency is added for that setup.

Key paths: `renderer/index.html` (UI, Three.js scene, crop, export), `renderer/book-model.js` (hardcover geometry), `renderer/three.min.js` (vendored Three.js r128), `tests/` (Node geometry and browser workflow), and `src-tauri/` (Tauri 2 shell/native file operations). The repository also declares a newer npm Three.js dependency, but the runtime remains vendored r128 and is not upgraded here.

### References
- [Bookmobile: How do you calculate the hardcover size?](https://info.bookmobile.com/knowledge/how-do-you-calculate-the-hardcover-size)
- [Three.js Texture documentation](https://threejs.org/docs/#api/en/textures/Texture)
- [Three.js Color documentation](https://threejs.org/docs/#api/en/math/Color)

MIT; see [LICENSE](LICENSE).
