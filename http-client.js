const axios = require('axios');
const dns = require('dns');
const dnsPromises = require('dns').promises;
const https = require('https');
const http = require('http');
const { EventEmitter } = require('events');
const { ServerI18n } = require('./server/i18n');

class HttpClient extends EventEmitter {
    constructor(lang = 'en') {
        super();
        this.lang = lang;
        this.userAgents = [
            // Chrome on Windows - more versions
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            // Chrome on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            // Firefox on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
            // Firefox on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
            // Safari on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
            // Edge on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.81',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.2592.102',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.2478.67',
            // Chrome on Linux
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            // Firefox on Linux
            'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
            // Mobile Chrome
            'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
        ];
        this.currentUserAgent = this.getRandomUserAgent();
        this.lastRequestTime = 0;
        this.minRequestInterval = 3000; // 3 seconds minimum between requests
    }

    getRandomUserAgent() {
        const index = Math.floor(Math.random() * this.userAgents.length);
        return this.userAgents[index];
    }

    emitProgress(stage, message, percent) {
        this.emit('progress', { stage, message, percent, timestamp: Date.now() });
    }

    createCustomAgent(targetIP) {
        // Set default IP if undefined or null
        const ip = targetIP || '216.239.38.120';

        // Debug logging
        console.log('createCustomAgent called with:', { targetIP, ip });

        // Validate ip
        if (!ip || typeof ip !== 'string' || ip.trim() === '') {
            throw new Error(`Invalid target IP address: ${JSON.stringify(targetIP)}`);
        }

        try {
            const agent = new https.Agent({
                keepAlive: true,
                rejectUnauthorized: false,
                timeout: 30000,
                secureProtocol: 'TLSv1_2_method',
                ciphers: [
                    'ECDHE-ECDSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-ECDSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-ECDSA-CHACHA20-POLY1305',
                    'ECDHE-RSA-CHACHA20-POLY1305',
                    'ECDHE-RSA-AES128-SHA',
                    'ECDHE-RSA-AES256-SHA',
                    'AES128-GCM-SHA256',
                    'AES256-GCM-SHA384',
                    'AES128-SHA',
                    'AES256-SHA',
                    'DES-CBC3-SHA'
                ].join(':'),
                honorCipherOrder: true,
                servername: 't-me.translate.goog'
            });
            return agent;
        } catch (error) {
            console.error('Error creating custom agent:', error);
            throw error;
        }
    }

    async checkInternetConnection() {
        try {
            // Check connectivity by resolving google.com
            await dnsPromises.lookup('google.com');
            return true;
        } catch (error) {
            return false;
        }
    }

    formatTelegramUrl(input) {
        // Remove whitespace and convert to lowercase
        const cleanInput = input.trim().toLowerCase();

        // If it's already a t.me URL, return as is
        if (cleanInput.startsWith('t.me/')) {
            return `https://${cleanInput}`;
        }

        // If it's already a full URL, return as is
        if (cleanInput.startsWith('https://t.me/') || cleanInput.startsWith('http://t.me/')) {
            return cleanInput;
        }

        // If it's just a username, format as t.me/s/username
        if (!cleanInput.includes('/') && !cleanInput.includes('.')) {
            return `https://t.me/s/${cleanInput}`;
        }

        // If it's t.me/s/username format, add https://
        if (cleanInput.startsWith('t.me/s/')) {
            return `https://${cleanInput}`;
        }

        // Default: treat as username
        return `https://t.me/s/${cleanInput}`;
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            console.error('Invalid URL:', url);
            return null;
        }
    }

    async simulateGoogleDNS(url) {
        const domain = this.extractDomain(url);
        if (!domain) return null;

        try {
            // Create custom agent for DNS resolution
            const httpsAgent = this.createCustomAgent('216.239.38.120');

            // Create axios instance with custom DNS resolution via agent
            const instance = axios.create({
                timeout: 30000,
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 500;
                },
                httpsAgent: httpsAgent
            });

            return instance;
        } catch (error) {
            console.error('DNS simulation failed:', error.message);
            return null;
        }
    }

    async curlSetopts(input, customHeaders = [], retryCount = 0) {
        const maxRetries = 3;
        const baseDelay = 2000; // 2 seconds base delay
        const proxyMethods = ['google', 'google2', 'google3', 'google4', 'direct'];
        const currentProxyMethod = proxyMethods[retryCount % proxyMethods.length];

        try {
            // Rate limiting: ensure minimum interval between requests
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.minRequestInterval) {
                const waitTime = this.minRequestInterval - timeSinceLastRequest;
                this.emitProgress(1, ServerI18n.t('waitingRateLimit', this.lang, waitTime), 5);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
            this.lastRequestTime = Date.now();

            this.emitProgress(2, ServerI18n.t('validatingInput', this.lang), 10);

            // Validate input
            if (!input || typeof input !== 'string') {
                this.emitProgress(0, ServerI18n.t('invalidInput', this.lang), 0);
                return {
                    success: false,
                    error: ServerI18n.t('invalidInput', this.lang),
                    code: 'INVALID_INPUT'
                };
            }

            // Format Telegram URL from username or existing URL
            this.emitProgress(3, ServerI18n.t('buildingTelegramUrl', this.lang), 20);
            const originalUrl = this.formatTelegramUrl(input);
            console.log('Formatted URL:', originalUrl);

            // Add delay to avoid rate limiting
            if (retryCount > 0) {
                const delay = baseDelay * Math.pow(2, retryCount - 1); // Exponential backoff
                this.emitProgress(4, ServerI18n.t('waitingRateLimitRetry', this.lang, delay), 30);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            // Check internet connection first
            this.emitProgress(5, ServerI18n.t('checkingInternet', this.lang), 30);
            const isConnected = await this.checkInternetConnection();
            if (!isConnected) {
                this.emitProgress(0, ServerI18n.t('noInternetConnection', this.lang), 0);
                return {
                    success: false,
                    error: ServerI18n.t('noInternetConnection', this.lang),
                    code: 'NO_INTERNET'
                };
            }

            // Use Google Translate proxy method like PHP version
            let url, headers, agent;

            if (originalUrl.includes('t.me')) {
                // Extract domain and path from original URL with error handling
                this.emitProgress(6, ServerI18n.t('parsingUrl', this.lang), 40);
                let path;
                try {
                    const urlObj = new URL(originalUrl);
                    const pathname = urlObj.pathname || '';
                    const search = urlObj.search || '';
                    path = pathname + search;

                    // Ensure path is not empty
                    if (!path || path.length === 0) {
                        path =
                            '/s/' +
                            input
                                .trim()
                                .replace('@', '')
                                .replace('t.me/', '')
                                .replace('https://t.me/', '');
                    }
                } catch (error) {
                    console.error('URL parsing error:', error.message);
                    this.emitProgress(0, ServerI18n.t('invalidUrlFormat', this.lang), 0);
                    return {
                        success: false,
                        error: ServerI18n.t('invalidUrlFormat', this.lang),
                        code: 'INVALID_URL'
                    };
                }

                // Use direct connection to preserve data-post attribute
                let proxyMethod = 'direct';
                let url;

                // Direct connection
                this.emitProgress(5, ServerI18n.t('tryingDirectMethod', this.lang), 50);
                url = originalUrl;

                // Create axios config
                this.emitProgress(7, ServerI18n.t('preparingHttpRequest', this.lang), 60);
                this.emitProgress(8, ServerI18n.t('configuringHttpRequest', this.lang), 70);

                const baseHeaders = {
                    'User-Agent': this.getRandomUserAgent(),
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1',
                    Pragma: 'no-cache',
                    'Cache-Control': 'no-cache'
                };

                // Adjust headers based on proxy method
                if (proxyMethod.startsWith('google')) {
                    baseHeaders.Host = 't-me.translate.goog';
                    baseHeaders.Referer = 'https://translate.google.com/';
                    baseHeaders.Origin = 'https://translate.google.com';
                }

                // Create custom agent with DNS resolution and SSL configuration
                let httpsAgent;
                if (proxyMethod.startsWith('google')) {
                    // Use different Google IPs for different methods
                    let googleIP = '216.239.38.120';
                    if (proxyMethod === 'google2') googleIP = '142.250.191.196';
                    if (proxyMethod === 'google3') googleIP = '142.250.184.196';
                    if (proxyMethod === 'google4') googleIP = '142.250.74.14';

                    httpsAgent = this.createCustomAgent(googleIP);
                } else {
                    httpsAgent = new https.Agent({
                        keepAlive: true,
                        rejectUnauthorized: false,
                        secureProtocol: 'TLSv1_2_method',
                        ciphers: [
                            'ECDHE-ECDSA-AES128-GCM-SHA256',
                            'ECDHE-RSA-AES128-GCM-SHA256',
                            'ECDHE-ECDSA-AES256-GCM-SHA384',
                            'ECDHE-RSA-AES256-GCM-SHA384'
                        ].join(':'),
                        honorCipherOrder: true
                    });
                }

                const config = {
                    method: 'get',
                    url: url,
                    headers: baseHeaders,
                    timeout: 30000,
                    maxRedirects: 3,
                    httpsAgent: httpsAgent,
                    validateStatus: function (status) {
                        return (status >= 200 && status < 400) || status === 429;
                    }
                };

                // Add DNS resolution like PHP CURLOPT_RESOLVE
                if (proxyMethod.startsWith('google')) {
                    config.dns = {
                        lookup: (hostname, options, callback) => {
                            console.log(`DNS lookup for hostname: ${hostname}`);

                            // Resolve Google domains to the target IP
                            if (
                                hostname === 'www.google.com' ||
                                hostname === 'google.com' ||
                                hostname === 'translate.google.com'
                            ) {
                                console.log(`Resolving ${hostname} to ${googleIP}`);
                                callback(null, googleIP, 4);
                            } else if (hostname === 't-me.translate.goog') {
                                console.log(`Resolving ${hostname} to ${googleIP}`);
                                callback(null, googleIP, 4);
                            } else if (hostname === 't.me') {
                                console.log(`Resolving ${hostname} to ${googleIP}`);
                                callback(null, googleIP, 4);
                            } else {
                                // Use default DNS for other hosts
                                require('dns').lookup(hostname, options, callback);
                            }
                        }
                    };
                }

                this.emitProgress(9, ServerI18n.t('sendingRequestViaProxy', this.lang), 80);
                const startTime = Date.now();
                const response = await axios(config);
                const endTime = Date.now();

                this.emitProgress(10, ServerI18n.t('processingResponse', this.lang), 90);

                console.log(`Request response:`, {
                    status: response.status,
                    dataLength: response.data ? response.data.length : 0,
                    responseTime: endTime - startTime,
                    headers: response.headers
                });

                // Check for timeout errors and retry like PHP
                if (
                    typeof response.data === 'string' &&
                    response.data.includes('cURL error') &&
                    response.data.includes('timeout')
                ) {
                    if (retryCount < 2) {
                        this.emitProgress(
                            0,
                            ServerI18n.t('timeoutRetrying', this.lang, retryCount + 1),
                            0
                        );
                        return await this.curlSetopts(input, customHeaders, retryCount + 1);
                    }
                }

                // Check for rate limit
                if (response.status === 429) {
                    if (retryCount < maxRetries) {
                        this.emitProgress(
                            0,
                            ServerI18n.t(
                                'rateLimitRetrying',
                                this.lang,
                                retryCount + 1,
                                maxRetries
                            ),
                            0
                        );
                        // Retry with exponential backoff
                        return await this.curlSetopts(input, customHeaders, retryCount + 1);
                    } else {
                        this.emitProgress(0, ServerI18n.t('retriesExhausted', this.lang), 0);
                        return {
                            success: false,
                            error: ServerI18n.t('allRetriesExhausted', this.lang),
                            code: 'RATE_LIMIT_EXHAUSTED',
                            status: response.status
                        };
                    }
                }

                this.emitProgress(11, ServerI18n.t('operationCompleted', this.lang), 100);

                return {
                    success: true,
                    data: response.data,
                    status: response.status,
                    headers: response.headers,
                    responseTime: endTime - startTime,
                    url: originalUrl
                };
            }
        } catch (error) {
            // Emit error progress
            this.emitProgress(0, ServerI18n.t('error', this.lang, error.message), 0);

            const errorResponse = {
                success: false,
                error: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            };

            if (error.code === 'ECONNABORTED') {
                errorResponse.error = ServerI18n.t('timeoutExceeded', this.lang);
                errorResponse.code = 'TIMEOUT';
            } else if (error.code === 'ENOTFOUND') {
                errorResponse.error = ServerI18n.t('dnsResolutionFailed', this.lang);
                errorResponse.code = 'DNS_ERROR';
            } else if (error.code === 'ECONNRESET') {
                errorResponse.error = ServerI18n.t('connectionReset', this.lang);
                errorResponse.code = 'CONNECTION_RESET';
            }

            return errorResponse;
        }
    }

    async post(input, data, customHeaders = {}) {
        try {
            // Format Telegram URL from username or existing URL
            const url = this.formatTelegramUrl(input);

            // Check internet connection first
            const isConnected = await this.checkInternetConnection();
            if (!isConnected) {
                return {
                    success: false,
                    error: ServerI18n.t('noInternetConnection', this.lang),
                    code: 'NO_INTERNET'
                };
            }

            const axiosInstance = await this.simulateGoogleDNS(url);
            if (!axiosInstance) {
                throw new Error(ServerI18n.t('dnsResolutionFailed', this.lang));
            }

            const headers = {
                'User-Agent': this.getRandomUserAgent(),
                'Content-Type': 'application/json',
                ...customHeaders
            };

            // Use custom agent for t.me domains to override DNS
            let agent;
            if (url.includes('t.me')) {
                agent = this.createCustomAgent('216.239.38.120');
            } else {
                agent = new https.Agent({ rejectUnauthorized: false });
            }

            const response = await axiosInstance.post(url, data, {
                headers,
                timeout: 30000,
                maxRedirects: 5,
                httpsAgent: agent
            });

            return {
                success: true,
                data: response.data,
                status: response.status,
                headers: response.headers
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code || 'UNKNOWN_ERROR'
            };
        }
    }
}

module.exports = HttpClient;
