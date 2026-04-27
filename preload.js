// preload.js - 安全的 Bridge 层
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('save-file-dialog', defaultName),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  readImageFile: (filePath) => ipcRenderer.invoke('read-image-file', filePath),
  saveImageFile: (filePath, base64Data) => ipcRenderer.invoke('save-image-file', filePath, base64Data),
  exportMultiAngles: (outputs, images) => ipcRenderer.invoke('export-multi-angles', outputs, images),
});
