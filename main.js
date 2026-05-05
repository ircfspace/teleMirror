const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { createServer } = require('./server/server');
const appConfig = require('./config/app.config');

const isDev = () => process.env.NODE_ENV === 'development';

// Fix GPU error by disabling GPU acceleration
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;
    let serverInstance;

    async function createWindow() {
        try {
            // Remove default menu
            Menu.setApplicationMenu(null);

            console.log('Creating server...');
            serverInstance = await createServer(appConfig.server.port);
            console.log(`Server created on port ${appConfig.server.port}`);

            console.log('Creating window...');

            mainWindow = new BrowserWindow({
                width: appConfig.window.width,
                height: appConfig.window.height,
                frame: true,
                resizable: appConfig.window.resizable,
                title: 'TeleMirror',
                devTools: isDev(),
                devToolsKeyCombination: isDev(),
                icon: appConfig.paths.icon,
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            // Set window title explicitly after creation
            mainWindow.setTitle('TeleMirror');

            // Force fullscreen after window is created and loaded
            // mainWindow.webContents.once('did-finish-load', () => {
            //     // Use simple fullscreen instead of true fullscreen
            //     mainWindow.setSimpleFullScreen(true);
            // });

            console.log('Loading HTML file...');
            mainWindow.loadFile(appConfig.paths.mainHtml);

            // Set title again after HTML is loaded
            mainWindow.webContents.once('did-finish-load', () => {
                mainWindow.setTitle('TeleMirror');
            });

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

    ipcMain.handle('get-app-config', () => {
        return appConfig.app;
    });

    // Cleanup function to close server
    function cleanup() {
        if (serverInstance && serverInstance.server) {
            console.log('Closing server...');
            serverInstance.server.close(() => {
                console.log('Server closed successfully');
            });
        }
    }

    // Handle app quit
    app.on('before-quit', () => {
        cleanup();
    });

    // Handle window close
    app.on('window-all-closed', () => {
        cleanup();
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.whenReady().then(createWindow);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
