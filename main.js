const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { createServer } = require('./server/server');

const isDev = () => process.env.NODE_ENV === 'development';

// Fix GPU error by disabling GPU acceleration
app.disableHardwareAcceleration();

let mainWindow;

async function createWindow() {
    try {
        // Remove default menu
        Menu.setApplicationMenu(null);

        console.log('Creating server...');
        const backend = await createServer(9876);
        console.log('Server created on port 9876');

        console.log('Creating window...');

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            frame: true,
            resizable: false,
            devTools: isDev(),
            devToolsKeyCombination: isDev(),
            icon: path.join(__dirname, 'assets', 'teleMirror.png'),
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // Force fullscreen after window is created and loaded
        mainWindow.webContents.once('did-finish-load', () => {
            // Use simple fullscreen instead of true fullscreen
            mainWindow.setSimpleFullScreen(true);
        });

        console.log('Loading HTML file...');
        mainWindow.loadFile('renderer/telegram-ui-new.html');
        console.log('Window loaded successfully');
    } catch (error) {
        console.error('Error in createWindow:', error);
    }
}

// IPC handlers
ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

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
