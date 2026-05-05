const axios = require('axios');
const fs = require('fs');
const path = require('path');

const REMOTE_URL = 'https://raw.githubusercontent.com/ircfspace/teleMirror/refs/heads/main/config/ads.config.json';
const LOCAL_PATH = path.join(__dirname, 'ads.config.json');
const FETCH_TIMEOUT = 5000;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedConfig = null;
let cacheTimestamp = 0;

function isValidAdsConfig(data) {
    return (
        data &&
        typeof data === 'object' &&
        data.settings &&
        typeof data.settings === 'object' &&
        Array.isArray(data.ads)
    );
}

async function fetchRemoteConfig() {
    const response = await axios.get(REMOTE_URL, {
        timeout: FETCH_TIMEOUT,
        headers: {
            'User-Agent': 'teleMirror/1.0',
            Accept: 'application/json'
        }
    });

    if (response.data && isValidAdsConfig(response.data)) {
        return response.data;
    }

    throw new Error('Remote ads config is invalid');
}

function readLocalConfig() {
    const raw = fs.readFileSync(LOCAL_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (!isValidAdsConfig(data)) {
        throw new Error('Local ads config is invalid');
    }
    return data;
}

async function loadAdsConfig() {
    const now = Date.now();

    if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedConfig;
    }

    try {
        const remoteConfig = await fetchRemoteConfig();
        cachedConfig = remoteConfig;
        cacheTimestamp = now;
        console.log('[AdsConfig] Loaded from remote successfully');
        return remoteConfig;
    } catch (error) {
        console.log('[AdsConfig] Remote fetch failed:', error.message);
    }

    try {
        const localConfig = readLocalConfig();
        cachedConfig = localConfig;
        cacheTimestamp = now;
        console.log('[AdsConfig] Loaded from local fallback');
        return localConfig;
    } catch (error) {
        console.error('[AdsConfig] Local fallback failed:', error.message);
        return {
            settings: { enabled: false },
            ads: []
        };
    }
}

module.exports = { loadAdsConfig };
