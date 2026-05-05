// Load app configuration and set dynamic values
// This script should run first to set up app-wide configuration

// Load app config from backend via IPC
async function loadAppConfig() {
    try {
        const appConfig = await window.api.getAppConfig();
        window.appConfig = { app: appConfig };

        // Set document title dynamically
        document.title = window.appConfig.app.title;

        // Set title bar text
        const titleBarText = document.querySelector('.title-bar-text');
        if (titleBarText) {
            titleBarText.textContent = window.appConfig.app.title;
        }
    } catch (error) {
        console.error('Failed to load app config:', error);
        // Set minimal defaults without hardcoded app info
        window.appConfig = {
            app: {
                name: 'TeleMirror',
                title: 'TeleMirror'
            }
        };
        document.title = 'TeleMirror';
    }
}

// Load config immediately
loadAppConfig();
