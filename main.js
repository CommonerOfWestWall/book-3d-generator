// main.js - Electron 主进程
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 禁用菜单栏
  const menu = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 打开文件对话框
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择展开封面长图',
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'tif', 'tiff', 'webp', 'bmp'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  return result;
});

// 保存文件对话框
ipcMain.handle('save-file-dialog', async (event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '保存样机图',
    defaultPath: defaultName,
    filters: [
      { name: 'PNG 图片（透明背景）', extensions: ['png'] },
      { name: 'JPG 图片（白色背景）', extensions: ['jpg'] }
    ]
  });
  return result;
});

// 选择批量导出文件夹
ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择批量导出文件夹',
    properties: ['openDirectory', 'createDirectory']
  });
  return result;
});

// 读取图片文件（返回 base64）
ipcMain.handle('read-image-file', async (event, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().slice(1);
    const mimeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'tif': 'image/tiff',
      'tiff': 'image/tiff',
      'webp': 'image/webp',
      'bmp': 'image/bmp'
    };
    const mime = mimeMap[ext] || 'image/png';
    return 'data:' + mime + ';base64,' + buffer.toString('base64');
  } catch (e) {
    return null;
  }
});

// 保存图片（从 base64 保存为文件）
ipcMain.handle('save-image-file', async (event, filePath, base64Data) => {
  try {
    const data = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return true;
  } catch (e) {
    return false;
  }
});

// 保存多个角度
ipcMain.handle('export-multi-angles', async (event, outputs, images) => {
  try {
    for (const item of outputs) {
      const data = item.base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(data, 'base64');
      fs.writeFileSync(item.path, buffer);
    }
    return true;
  } catch (e) {
    return false;
  }
});

// 获取图片尺寸
ipcMain.handle('get-image-dimensions', async (event, base64Data) => {
  // 前端直接读取，这里仅作占位
  return null;
});
