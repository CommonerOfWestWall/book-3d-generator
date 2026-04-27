# 立体书样机生成器

> **English?** Jump to [English Section](#english).

---

## 📖 简介

立体书样机生成器是一款基于 **Electron + Three.js** 的 Windows 桌面应用，可将书籍封面展开长图一键渲染为逼真的 **3D 书籍效果图**，支持：

- 🖼️ 支持封面长图格式（封面 + 书脊 + 封底水平拼接图）
- 📐 精准控制书脊宽度、封面厚度、内页深度
- 🔄 三种翻页视角：平摊视角 / 半开视角 / 全开视角
- 🎨 背景模式：纯透明 / 纯色 / 渐变
- 📦 批量导出多角度效果图（PNG / JPG）
- ⚡ 实时预览，拖拽即调

---

## 🖥️ 快速开始

### 方式一：下载 exe 直接运行（推荐）

👉 **下载最新版本 → [Releases 页面](https://github.com/CommonerOfWestWall/book-3d-generator/releases)**

下载 `立体书样机生成器-免安装精简版-v6.zip`，解压后双击 `立体书样机生成器.exe` 即可运行，**无需安装，无需联网**。

> ⚠️ 首次运行如果杀毒软件报毒（ Electron 壳程序特征），请添加信任或关闭杀毒，这是正常现象。

---

### 方式二：从源码运行

#### 环境要求

- Node.js ≥ 18（含 npm）
- Windows 10/11（x64）

#### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/CommonerOfWestWall/book-3d-generator.git
cd book-3d-generator

# 安装依赖
npm install

# 启动应用
npm start
```

#### 打包为 exe

```bash
npm install --save-dev electron-builder
npm run build
```

打包产物在 `dist_portable/` 目录中。

---

## 📸 封面图要求

软件接受一张**水平拼接的展开长图**，格式如下：

```
[封面（左）] [书脊（中）] [封底（右）]
```

| 区域 | 说明 |
|------|------|
| 封面（左） | 书籍正面 |
| 书脊（中） | 书脊区域，建议宽度为主图的 10%~15% |
| 封底（右） | 书籍背面 |

支持的图片格式：`jpg / jpeg / png / tif / tiff / webp / bmp`

---

## 🎮 功能说明

### 视角模式

| 模式 | 说明 |
|------|------|
| **平摊视角** | 两页完全展开铺平，适合展示内页设计 |
| **半开视角** | 书籍半开状态，可调翻页角度 0°~180° |
| **全开视角** | 经典 3D 书籍展示，封面和封底各约 30° 外翻 |

### 参数控制

- **书脊宽度**：书脊区域占主图宽度的百分比（默认 12%）
- **封面厚度**：书籍侧边厚度感（默认 3.0）
- **内页深度**：书页层叠的厚度感（默认 1.5）
- **翻页角度**：半开视角时左右翻开的角度
- **Y 轴旋转**：绕垂直轴旋转，360° 自由调整
- **预设角度**：快速切换常见展示角度（俯视、左视、45° 等）

### 背景模式

- **透明**：输出 PNG 透明背景，适用于印刷品排版
- **白色**：纯白背景，适用于电商主图
- **渐变**：蓝紫渐变，适合社交媒体展示

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 33 |
| 3D 渲染 | Three.js 0.171 |
| 构建工具 | electron-builder |
| 许可证 | MIT |

---

## 📄 许可证

本项目采用 **MIT 许可证**开源。详见 [LICENSE](LICENSE) 文件。

---

## 🌟 Star History

如果这个工具对你有帮助，欢迎点个 ⭐ Star！

---

<a name="english"></a>

---

## 3D Book Mockup Generator

### Overview

A lightweight Windows desktop application built with **Electron + Three.js** that renders book cover images into photorealistic **3D book mockups** — no internet required, no installation needed.

### Features

- 📐 Support for flat-spread cover images (front cover + spine + back cover)
- 📏 Precise control: spine width, cover thickness, page depth
- 🔄 Three open modes: flat / half-open / fully open
- 🎨 Background modes: transparent / white / gradient
- 📦 Batch export multiple angles as PNG or JPG
- ⚡ Real-time preview with drag-and-drop

### Quick Start (exe)

Download from the **[Releases page](https://github.com/CommonerOfWestWall/book-3d-generator/releases)** → download the latest `.zip` → extract and double-click the `.exe`.

### Run from Source

```bash
git clone https://github.com/CommonerOfWestWall/book-3d-generator.git
cd book-3d-generator
npm install
npm start
```

### Build exe

```bash
npm install --save-dev electron-builder
npm run build
```

### License

MIT — see [LICENSE](LICENSE).
