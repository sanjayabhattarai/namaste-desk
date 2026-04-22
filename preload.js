const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveGuest: (formData) => ipcRenderer.invoke('save-guest', formData),
  searchGuests: (payload) => ipcRenderer.invoke('search-guests', payload),
  getRoomStatuses: (payload) => ipcRenderer.invoke('get-room-statuses', payload),
  releaseRoomStatus: (payload) => ipcRenderer.invoke('release-room-status', payload),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
});
