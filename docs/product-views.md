# 商品视角与自定义设置 / Product Views and Saved Settings

本文记录稳定版 `1.2.0` 的内置视角与本地保存行为；发布状态和下载资产以 [GitHub v1.2.0 发布页](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.2.0)为准。 This document describes the stable `1.2.0` built-in views and local persistence; release status and assets are tracked on the [GitHub v1.2.0 release page](https://github.com/CommonerOfWestWall/book-3d-generator/releases/tag/v1.2.0).

## 抽样参考 / Qualitative References
检查日期 / Inspected: 2026-10-10.

这不是全平台统计调查，无法从商品照片精确反推出 Euler 角度。下表记录实际观察到的构图；预设度数是本工具中的校准结果，不是平台官方要求。

This is a qualitative sample, not a platform-wide survey. Product photos do not provide exact Euler angles. The presets are renderer-specific calibrations, not official platform requirements.

| 来源 / Source | 观察与限制 / Observation and Limits |
| --- | --- |
| [当当：万历的紫禁城精装](https://product.dangdang.com/30046701.html) | 商品首图及画廊缩略图可见直立微侧、封底、平放斜俯等构图；本次未完整打开所有放大图。 The listing and gallery thumbnails show upright shallow side views, back-cover and oblique flat-lay compositions; not all enlarged gallery images were accessible. |
| [博客来：S. 收藏盒](https://www.books.com.tw/products/0010646115) | 实际页面首图为封面占主体、侧面露出的直立产品图，画廊有正视和俯拍；它是收藏盒，不用于证明精装书几何。 The visible listing uses an upright front-dominant product with a side face; gallery thumbnails include straight and top views. This boxed edition is a composition reference, not hardcover geometry evidence. |
| [苏宁：活着](https://product.suning.com/0070988566/11785541829.html) | 详情页跳转登录；搜索返回的[公开商品图](https://uimgproxy.suning.cn/uimg1/sop/commodity/ZER9ADzmI7fBcKJCkq2BlQ.jpg)已查看，为封面主体加窄书脊。 Listing requires login; the observed public product image is front-dominant with a narrow visible spine. |
| [京东：活着精装](https://item.jd.com/product/uOx7R5DZa0O2NOzf5Qc8cw.html) | 详情页要求登录，只看到了公开的小尺寸图片；不足以做精确角度判断。 Listing requires login; only small public thumbnails were accessible, insufficient for exact-angle conclusions. |
| [Amazon KDP 精装封面说明](https://kdp.amazon.com/en_US/help/topic/GDTKFJPNQCBTMRV6) | 文档说明封面缩略图使用正面区域，支持保留正视图；不是立体样机角度规范。 Documentation describes front-cover thumbnails, supporting inclusion of a straight-front view, not a 3D angle standard. |

淘宝/天猫、拼多多未获得可可靠核验的完整商品画廊，不宣称覆盖它们。未绕过登录或访问限制。

No reliably inspectable full galleries were obtained for Taobao/Tmall or Pinduoduo. No login or access restrictions were bypassed.

## 内置视角 / Built-In Views
镜头高度均为 0，距离根据书型包围尺寸适配。 Built-in height is 0; distance adapts to the book's bounding dimensions.

| 视角 / View | X | Y | Z | 基准距离 / Base Distance | 组合 / Set |
| --- | ---: | ---: | ---: | ---: | --- |
| 封面正视 / Straight Front | 0° | 0° | 0° | 11.5 | 常用 / Common |
| 封面微侧 / Front and Spine | 0° | 25° | 0° | 11.5 | 常用 / Common |
| 书口微侧 / Front and Fore-Edge | 0° | -25° | 0° | 11.5 | 常用 / Common |
| 封底正视 / Straight Back | 0° | 180° | 0° | 11.5 | 常用 / Common |
| 封底微侧 / Back and Spine | 0° | 155° | 0° | 11.5 | 推荐补充 / Additional |
| 斜俯展示 / Oblique Top | -48° | -20° | -20° | 12 | 推荐补充 / Additional |

优先保留书名可读、封面占主体的构图，减少原来较大的侧转和仰视。斜俯视角用于补充展示，不是所有平台的推荐主图。

The default set favors readable titles and front-dominant framing over stronger side rotations and low-angle views. The oblique view is supplementary, not a universal main-image recommendation.

## 保存与导出 / Save and Export
1. 在“视角”页调整旋转、距离、高度，填写名称并点击保存图标。 Enter a name and save the current rotations, distance and height in the View tab.
2. 点击保存的名称应用；保存、铅笔、垃圾桶图标分别更新当前参数、重命名、删除。更新和删除需要确认。 Apply by clicking its name; the save, pencil and trash icons update, rename and delete. Updating and deleting require confirmation.
3. 在“导出”页选择组合或逐项勾选，可混合内置和自定义视角。新视角自动勾选，批量选择也会保留。 Choose a group or individual checkboxes in Export; built-in/custom views may be mixed. Newly saved views are selected automatically and batch selections persist.

名称允许 1 至 40 个 Unicode 字符，同名（忽略大小写）不能重复；导出文件名自动替换 Windows 不允许的字符，并带序号和时间标记。至多 100 个自定义视角。参数只包含相机，不包含封面、书型、背景和输出尺寸。

Names accept 1–40 Unicode characters and must be unique ignoring case. Export filenames sanitize Windows-invalid characters and include sequence and time markers. Up to 100 custom views are allowed. Saved values include camera settings only, not the image, structure, background or output size.

自定义视角保留精确数值，不随另一本书自动缩放。不同开本可能需要点“适配画面”后更新保存。设置按当前 Windows 用户与应用标识保存在 WebView 本地存储；更换电脑、删除应用数据或使用不同浏览器网址，不会自动迁移。

Custom views preserve exact values without automatic rescaling to another cover. A different format may require fitting and updating the view. Storage belongs to the current Windows user and application identity; it does not automatically migrate between computers, cleared profiles or browser origins.

存储损坏时禁用改写并保留原始内容；不会自动清空。空间不足或权限问题导致保存失败时，界面明确提示且不替换原设置。

Corrupt storage is retained with writes disabled, never cleared automatically. Failed writes such as quota or permission errors are reported without replacing previous settings.

## 验证 / Verification
- 17 项 Node 单测通过；浏览器验证平装和精装共 12 个预设输出的非空像素与不裁边、三种导出分辨率、桌面与移动布局，以及保存/重命名/更新/删除、存储异常和混合批量导出。 17 Node tests pass; browser tests cover 12 paperback/hardcover preset outputs with nonblank pixels and framing bounds, three export resolutions, responsive layouts, saved-view CRUD, storage errors and mixed batch export.
- Tauri EXE 和 NSIS 安装包构建通过，文件版本均为 1.2.0。隔离 WebView2 测试确认完整退出再启动后设置保留，自定义批量 PNG 与同角度单张 PNG 字节相同；实际保存使用 Rust 文件接口。 Tauri and NSIS builds pass with file version 1.2.0. Isolated WebView2 tests verify persistence after full process restart and byte-identical single/custom-batch PNGs saved through the real Rust file API.
- 未重新验证安装向导、缺失 WebView2 时的下载过程或 Electron 打包；原生文件夹对话框取消路径采用模拟结果测试。 Installer wizard, missing-runtime download and Electron packaging were not re-tested; native folder-dialog cancellation uses mocked results.
