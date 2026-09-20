const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'), // 👈 Pastikan file icon.ico ada sejajar dengan main.js
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Karena ini aplikasi production lokal/online, kita arahkan ke URL Vercel kamu
  // Atau bisa diload secara lokal jika dijalankan offline
  mainWindow.loadURL('https://bengkel-josjis.vercel.app/');

  // Hilangkan menu bar bawaan Chrome/Electron biar bersih kayak aplikasi profesional
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});