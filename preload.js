const { contextBridge, ipcRenderer } = require('electron');

function generateRequestId() {
    return 'req_' + Math.random().toString(36).substring(2, 15);
}

contextBridge.exposeInMainWorld('api', {
    generateRequestId,
    getServerPort: async () => {
        return await ipcRenderer.invoke('get-server-port');
    },
    fetchUrl: async (url, requestId) => {
        const lang = localStorage.getItem('appLanguage') || 'en';
        const port = await ipcRenderer.invoke('get-server-port');
                const res = await fetch(`http://localhost:${port}/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, requestId, lang })
        });

        return res.json();
    },
    connectProgress: async (requestId, onProgress) => {
        const lang = localStorage.getItem('appLanguage') || 'en';
        const port = await ipcRenderer.invoke('get-server-port');
                const eventSource = new EventSource(
            `http://localhost:${port}/progress/${requestId}?lang=${lang}`
        );

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onProgress(data);
        };

        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
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
