const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "agnesDesktop",
  Object.freeze({
    chooseProject: (kind) => ipcRenderer.invoke("agnes:choose-project", kind),
    openProject: (token) => ipcRenderer.invoke("agnes:open-project", token),
    windowAction: (action) => ipcRenderer.invoke("agnes:window-action", action),
  }),
);
