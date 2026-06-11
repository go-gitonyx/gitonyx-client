import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gitBridge', {
  exec: (args: string[], cwd: string) => ipcRenderer.invoke('git:exec', args, cwd),
  version: () => ipcRenderer.invoke('git:version'),
  selectRepo: () => ipcRenderer.invoke('git:selectRepo'),
  setAuth: (username: string, password: string) => ipcRenderer.invoke('git:setAuth', username, password),
  clearAuth: () => ipcRenderer.invoke('git:clearAuth'),
  authStatus: () => ipcRenderer.invoke('git:authStatus'),
  readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
})
