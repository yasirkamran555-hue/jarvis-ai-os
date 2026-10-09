const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  openYoutube: () => ipcRenderer.invoke('browser:open-youtube')
});
