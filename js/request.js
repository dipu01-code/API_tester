/* ===================================================
   request.js — HTTP Request Engine
   Handles sending requests via fetch()
   =================================================== */

const RequestEngine = (() => {
    /**
     * Send an HTTP request
     * @param {Object} config - Request configuration
     * @param {string} config.method - HTTP method
     * @param {string} config.url - Request URL
     * @param {Object} config.headers - Request headers
     * @param {string|null} config.body - Request body
     * @param {string} config.bodyType - Body content type
     * @returns {Promise<Object>} - Response data
     */
    async function send(config) {
        const { method, url, headers = {}, body = null, bodyType = 'none' } = config;

        if (!url || !url.trim()) {
            throw new Error('Please enter a URL');
        }

        // Build fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {},
            mode: 'cors',
        };

        // Add headers
        Object.entries(headers).forEach(([key, value]) => {
            if (key && value) {
                fetchOptions.headers[key] = value;
            }
        });

        // Add body for methods that support it
        const methodsWithBody = ['POST', 'PUT', 'PATCH'];
        if (methodsWithBody.includes(fetchOptions.method) && body && bodyType !== 'none') {
            if (bodyType === 'json') {
                fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/json';
                // Validate JSON
                try {
                    JSON.parse(body);
                    fetchOptions.body = body;
                } catch (e) {
                    fetchOptions.body = body; // Send as-is, let server handle
                }
            } else if (bodyType === 'text') {
                fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'text/plain';
                fetchOptions.body = body;
            } else if (bodyType === 'urlencoded') {
                fetchOptions.headers['Content-Type'] = fetchOptions.headers['Content-Type'] || 'application/x-www-form-urlencoded';
                fetchOptions.body = body;
            } else if (bodyType === 'formdata') {
                // FormData will be passed directly, browser sets Content-Type with boundary
                fetchOptions.body = body; 
            } else {
                fetchOptions.body = body;
            }
        }

        // Measure response time
        const startTime = performance.now();

        try {
            const response = await fetch(url, fetchOptions);
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            // Read response body as text
            const responseText = await response.text();

            // Get response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            // Calculate response size
            const size = new Blob([responseText]).size;

            return {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                body: responseText,
                time: duration,
                size: size,
                ok: response.ok,
                url: response.url,
            };
        } catch (error) {
            const endTime = performance.now();
            const duration = Math.round(endTime - startTime);

            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                throw new Error(
                    `Network error: Could not connect to ${url}. ` +
                    `This might be a CORS issue, or the server may be down.`
                );
            }
            throw error;
        }
    }

    /**
     * Format bytes to human-readable string
     */
    function formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + units[i];
    }

    /**
     * Format milliseconds to human-readable string
     */
    function formatTime(ms) {
        if (ms < 1000) return ms + ' ms';
        return (ms / 1000).toFixed(2) + ' s';
    }

    return { send, formatSize, formatTime };
})();
