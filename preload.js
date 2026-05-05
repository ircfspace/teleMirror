const { contextBridge, ipcRenderer } = require('electron');

function generateRequestId() {
    return 'req_' + Math.random().toString(36).substring(2, 15);
}

contextBridge.exposeInMainWorld('api', {
    generateRequestId,
    fetchUrl: async (url, requestId) => {
        const res = await fetch('http://localhost:9876/fetch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, requestId })
        });

        return res.json();
    },
    connectProgress: (requestId, onProgress) => {
        const eventSource = new EventSource(`http://localhost:9876/progress/${requestId}`);

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
