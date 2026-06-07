const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Proxy fetch — bypasses CORS, used by all extensions
  fetch: (url: string, options?: RequestInit) =>
    ipcRenderer.invoke('extension:fetch', url, options),

  validateStream: (url: string, referer?: string, headers?: Record<string, string>) =>
    ipcRenderer.invoke('extension:validate-stream', url, referer, headers),

  executeExtension: (extensionId: string, method: string, args: any[]) =>
    ipcRenderer.invoke('execute-extension-method', { extensionId, method, args }),

  // Fetch inside a hidden BrowserWindow to allow JS-driven players to load
  // and reveal media URLs (used for YourUpload interception).
  fetchInBrowser: (url: string) => ipcRenderer.invoke('extension:fetch-in-browser', url),
  // Legacy helper that returns raw base64 (no data URI)
  fetchImage: (url: string, referer?: string) => ipcRenderer.invoke('extension:fetch-image', url, referer),
  // New helper that calls main's 'fetchImage' handler which returns a full data URI
  fetchImageData: (url: string, referer?: string) => ipcRenderer.invoke('fetchImage', url, referer),

  platform: process.platform,
});

// Window controls
contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
});
