const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveGuest: (formData) => ipcRenderer.invoke('save-guest', formData),
  searchGuests: (payload) => ipcRenderer.invoke('search-guests', payload),
  searchGuestsList: (payload) => ipcRenderer.invoke('search-guests-list', payload),
  readIdCardDataUrl: (payload) => ipcRenderer.invoke('read-id-card-data-url', payload),
  getGuestStays: (payload) => ipcRenderer.invoke('get-guest-stays', payload),
  getRoomStatuses: (payload) => ipcRenderer.invoke('get-room-statuses', payload),
  releaseRoomStatus: (payload) => ipcRenderer.invoke('release-room-status', payload),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
});
