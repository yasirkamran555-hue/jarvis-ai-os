const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  isElectron: true
});
