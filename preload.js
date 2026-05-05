const { contextBridge, ipcRenderer } = require('electron');

function generateRequestId() {
    return 'req_' + Math.random().toString(36).substring(2, 15);
}

contextBridge.exposeInMainWorld('api', {
    generateRequestId,
    fetchUrl: async (url, requestId) => {
        const lang = localStorage.getItem('appLanguage') || 'en';
        const res = await fetch('http://localhost:9876/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, requestId, lang })
        });

        return res.json();
    },
    connectProgress: (requestId, onProgress) => {
        const lang = localStorage.getItem('appLanguage') || 'en';
        const eventSource = new EventSource(
            `http://localhost:9876/progress/${requestId}?lang=${lang}`
        );

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onProgress(data);
        };

        eventSource.onerror = () => {
            eventSource.close();
        };

        return () => eventSource.close();
    },
    minimizeWindow: () => {
        ipcRenderer.send('minimize-window');
    },
    closeWindow: () => {
        ipcRenderer.send('close-window');
    },
    getAppConfig: () => {
        return ipcRenderer.invoke('get-app-config');
    },
    getAdsConfig: () => {
        return ipcRenderer.invoke('get-ads-config');
    }
});
