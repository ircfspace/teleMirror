const express = require('express');
const FlowManager = require('./flow-manager');
const { ServerI18n } = require('./i18n');

function createServer(port = 9876) {
    const app = express();
    app.use(express.json());

    // Store active requests with their progress clients
    const activeRequests = new Map();

    // SSE endpoint for progress
    app.get('/progress/:requestId', (req, res) => {
        const requestId = req.params.requestId;
        const lang = req.query.lang || 'en';

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Store the response object to send events
        if (!activeRequests.has(requestId)) {
            activeRequests.set(requestId, { progressListeners: [], lang });
        } else {
            const requestData = activeRequests.get(requestId);
            requestData.lang = lang;
        }
        const requestData = activeRequests.get(requestId);
        requestData.progressListeners.push(res);

        // Send initial connection message
        res.write(
            `data: ${JSON.stringify({ stage: 0, message: ServerI18n.t('connectionEstablished', lang), percent: 0 })}\n\n`
        );

        // Clean up on close
        req.on('close', () => {
            const idx = requestData.progressListeners.indexOf(res);
            if (idx > -1) {
                requestData.progressListeners.splice(idx, 1);
            }
            if (requestData.progressListeners.length === 0) {
                activeRequests.delete(requestId);
            }
        });
    });

    app.post('/fetch', async (req, res) => {
        const { url, requestId, lang } = req.body;
        const requestLang =
            requestId && activeRequests.has(requestId)
                ? activeRequests.get(requestId).lang
                : lang || 'en';

        // Create a new FlowManager per request with language context
        const flowManager = new FlowManager(requestLang);

        // Set up progress listener if requestId provided
        if (requestId && activeRequests.has(requestId)) {
            const requestData = activeRequests.get(requestId);

            // Create progress callback that broadcasts to all listeners
            const progressCallback = (step, message, percent) => {
                const progressData = { step, message, percent, timestamp: Date.now() };
                requestData.progressListeners.forEach((listener) => {
                    listener.write(`data: ${JSON.stringify(progressData)}\n\n`);
                });
            };

            try {
                // Execute the complete flow using FlowManager
                const result = await flowManager.executeFlow(url, progressCallback);

                console.log('Flow execution result:', {
                    success: result.success,
                    flow: result.flow,
                    source: result.source,
                    online: result.online,
                    offline: result.offline
                });

                res.json(result);
            } catch (error) {
                console.error('Flow execution error:', error);
                res.json({
                    success: false,
                    error: ServerI18n.t('flowExecutionError', requestLang, error.message),
                    code: 'FLOW_EXECUTION_ERROR'
                });
            } finally {
                // Clean up
                activeRequests.delete(requestId);
            }
        } else {
            // No progress tracking requested, execute flow directly
            try {
                const result = await flowManager.executeFlow(url);
                res.json(result);
            } catch (error) {
                console.error('Flow execution error (no progress):', error);
                res.json({
                    success: false,
                    error: ServerI18n.t('flowExecutionError', requestLang, error.message),
                    code: 'FLOW_EXECUTION_ERROR'
                });
            }
        }
    });

    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            resolve({ server, port });
        });
    });
}

module.exports = { createServer };
