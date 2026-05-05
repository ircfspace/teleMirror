const HttpClient = require('../http-client');
const axios = require('axios');

class FlowManager {
    constructor() {
        this.httpClient = new HttpClient();
        this.steps = {
            CHECK_CONNECTION: 'check_connection',
            ONLINE_TELEGRAM: 'online_telegram',
            ONLINE_GITHUB_FALLBACK: 'online_github_fallback',
            OFFLINE_GITHUB_DIRECT: 'offline_github_direct',
            ERROR_NO_INTERNET: 'error_no_internet'
        };
    }

    /**
     * Execute the complete flow for fetching Telegram data
     * @param {string} url - Telegram channel URL or username
     * @param {function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} - Result with data or error
     */
    async executeFlow(url, progressCallback) {
        try {
            // Step 1: Check internet connection
            progressCallback?.(this.steps.CHECK_CONNECTION, 'در حال بررسی اتصال به اینترنت...', 10);
            const isConnected = await this.httpClient.checkInternetConnection();

            if (!isConnected) {
                return await this.executeOfflineFlow(url, progressCallback);
            } else {
                return await this.executeOnlineFlow(url, progressCallback);
            }
        } catch (error) {
            console.error('Flow execution error:', error);
            return {
                success: false,
                error: 'خطا در اجرای فرآیند: ' + error.message,
                code: 'FLOW_ERROR'
            };
        }
    }

    /**
     * Execute offline flow - direct to cached data
     * @param {string} url - Telegram channel URL or username
     * @param {function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} - Result with data or error
     */
    async executeOfflineFlow(url, progressCallback) {
        progressCallback?.(
            this.steps.OFFLINE_GITHUB_DIRECT,
            'آفلاین: در حال تلاش برای داده‌های کش شده...',
            30
        );

        const username = this.extractUsernameFromUrl(url);
        if (!username) {
            return {
                success: false,
                error: 'به اینترنت دسترسی نداری و نام کاربری نامعتبر است. لطفاً اتصال اینترنت خود را بررسی کن.',
                code: 'NO_INTERNET_INVALID_USERNAME'
            };
        }

        try {
            const githubData = await this.fetchGitHubJsonData(username);
            if (githubData) {
                progressCallback?.(
                    this.steps.OFFLINE_GITHUB_DIRECT,
                    'داده‌های کش شده با موفقیت بارگذاری شد',
                    100
                );
                return {
                    success: true,
                    data: githubData,
                    status: 200,
                    headers: {},
                    responseTime: 0,
                    url: `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${username}.json`,
                    source: 'github',
                    offline: true,
                    flow: 'offline_direct'
                };
            }
        } catch (githubError) {
            console.log('GitHub JSON fetch failed in offline mode:', githubError.message);
        }

        // If cached version is also unavailable
        progressCallback?.(this.steps.ERROR_NO_INTERNET, 'خطا: به اینترنت و کش دسترسی نداری', 0);
        return {
            success: false,
            error: 'به اینترنت دسترسی نداری. لطفاً اتصال اینترنت خود را بررسی کن.',
            code: 'NO_INTERNET_NO_CACHE',
            flow: 'offline_failed'
        };
    }

    /**
     * Execute online flow - try Telegram first, then GitHub fallback
     * @param {string} url - Telegram channel URL or username
     * @param {function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} - Result with data or error
     */
    async executeOnlineFlow(url, progressCallback) {
        progressCallback?.(this.steps.ONLINE_TELEGRAM, 'آنلاین: در حال تلاش برای تلگرام...', 30);

        // Step 2: Try Telegram directly
        try {
            const response = await this.httpClient.curlSetopts(url);

            if (
                response.success &&
                response.data &&
                typeof response.data === 'string' &&
                response.data.includes('<html')
            ) {
                progressCallback?.(
                    this.steps.ONLINE_TELEGRAM,
                    'داده‌های تلگرام با موفقیت دریافت شد',
                    100
                );
                return {
                    success: true,
                    data: this.parseTelegramData(response.data),
                    status: response.status,
                    headers: response.headers,
                    responseTime: response.responseTime,
                    url: response.url,
                    online: true,
                    flow: 'online_telegram'
                };
            }
        } catch (telegramError) {
            console.log('Telegram fetch failed, trying GitHub fallback:', telegramError.message);
        }

        // Step 3: GitHub fallback for online mode
        progressCallback?.(
            this.steps.ONLINE_GITHUB_FALLBACK,
            'آنلاین: در حال تلاش برای کش به عنوان فال‌بک...',
            60
        );
        return await this.executeGitHubFallback(url, progressCallback, 'online_fallback');
    }

    /**
     * Execute GitHub fallback
     * @param {string} url - Telegram channel URL or username
     * @param {function} progressCallback - Callback for progress updates
     * @param {string} flowType - Type of flow for tracking
     * @returns {Promise<Object>} - Result with data or error
     */
    async executeGitHubFallback(url, progressCallback, flowType) {
        const username = this.extractUsernameFromUrl(url);
        if (!username) {
            return {
                success: false,
                error: 'نام کاربری نامعتبر است',
                code: 'INVALID_USERNAME'
            };
        }

        try {
            const githubData = await this.fetchGitHubJsonData(username);
            if (githubData) {
                progressCallback?.(
                    this.steps.ONLINE_GITHUB_FALLBACK,
                    'داده‌های کش با موفقیت بارگذاری شد',
                    100
                );
                return {
                    success: true,
                    data: githubData,
                    status: 200,
                    headers: {},
                    responseTime: 0,
                    url: `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${username}.json`,
                    source: 'github',
                    online: true,
                    flow: flowType
                };
            }
        } catch (githubError) {
            console.log('GitHub JSON fetch failed:', githubError.message);
        }

        return {
            success: false,
            error: 'دریافت داده از تلگرام و کش ممکن نیست',
            code: 'BOTH_SOURCES_FAILED',
            flow: flowType + '_failed'
        };
    }

    /**
     * Extract username from various URL formats
     * @param {string} url - Telegram channel URL or username
     * @returns {string|null} - Extracted username
     */
    extractUsernameFromUrl(url) {
        try {
            // Handle different URL formats
            if (url.includes('t.me/s/')) {
                const match = url.match(/t\.me\/s\/([^\/\?]+)/);
                return match ? match[1] : null;
            } else if (url.includes('t.me/')) {
                const match = url.match(/t\.me\/([^\/\?]+)/);
                return match ? match[1] : null;
            } else if (!url.includes('/')) {
                // If it's just a username
                return url.trim().replace('@', '');
            }
            return null;
        } catch (error) {
            console.error('Error extracting username:', error);
            return null;
        }
    }

    /**
     * Fetch GitHub JSON data
     * @param {string} username - Telegram channel username
     * @returns {Promise<Object|null>} - Parsed GitHub data
     */
    async fetchGitHubJsonData(username) {
        try {
            const lowercaseUsername = username.toLowerCase();
            const githubUrl = `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/${lowercaseUsername}.json`;

            console.log('Fetching GitHub JSON from:', githubUrl);

            const response = await axios.get(githubUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'teleMirror/1.0'
                }
            });

            if (response.data && typeof response.data === 'object') {
                // Convert GitHub JSON format to match existing structure
                const convertedData = this.convertGitHubJsonFormat(response.data);
                console.log('GitHub JSON converted successfully');
                return convertedData;
            }

            return null;
        } catch (error) {
            console.log('GitHub JSON fetch error:', error.message);
            return null;
        }
    }

    /**
     * Convert GitHub JSON format to match existing structure
     * @param {Object} githubData - Raw GitHub data
     * @returns {Object} - Converted data
     */
    convertGitHubJsonFormat(githubData) {
        try {
            const converted = {
                channel: {},
                posts: []
            };

            // Convert channel info
            if (githubData.info) {
                converted.channel = {
                    title: githubData.info.title || githubData.info.username || 'Unknown',
                    username: githubData.info.username || 'unknown',
                    photo: githubData.info.photo_url || null
                };
            }

            // Convert posts
            if (githubData.posts && Array.isArray(githubData.posts)) {
                converted.posts = githubData.posts.map((post) => ({
                    id: post.id || 0,
                    text: post.message || '',
                    time: post.date || new Date().toISOString(),
                    edited: post.edited || false,
                    views: post.views || 0,
                    author: post.sender_name || converted.channel.title,
                    isOwn: false,
                    media: [] // GitHub JSON doesn't seem to include media
                })); // Keep original order from GitHub data
            }

            return converted;
        } catch (error) {
            console.error('Error converting GitHub JSON format:', error);
            return null;
        }
    }

    /**
     * Parse Telegram HTML data (placeholder - should be implemented with actual parser)
     * @param {string} htmlData - HTML response from Telegram
     * @returns {Object} - Parsed data
     */
    parseTelegramData(htmlData) {
        // This should use the actual TelegramParser
        // For now, returning a placeholder
        const TelegramParser = require('../telegram-parser');
        const parser = new TelegramParser();
        return parser.parseFullPage(htmlData);
    }
}

module.exports = FlowManager;
