// Window control buttons functionality
document.getElementById('minimizeButton').addEventListener('click', () => {
    window.api.minimizeWindow();
});

document.getElementById('closeButton').addEventListener('click', () => {
    window.api.closeWindow();
});

// Initialize app
const channelManager = new ChannelManager();
channelManager.init();
ThemeManager.init();
LanguageManager.init();
