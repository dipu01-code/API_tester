/* ===================================================
   response.js — Response Display & Formatting
   Pretty-print, syntax highlighting, tab views
   =================================================== */

const ResponseViewer = (() => {
    let currentResponse = null;

    /**
     * Display a response in the response panel
     */
    function display(response) {
        currentResponse = response;

        // Update status badge
        const badge = document.getElementById('statusBadge');
        badge.textContent = `${response.status} ${response.statusText}`;
        badge.className = 'status-badge';
        if (response.status >= 200 && response.status < 300) badge.classList.add('status-2xx');
        else if (response.status >= 300 && response.status < 400) badge.classList.add('status-3xx');
        else if (response.status >= 400 && response.status < 500) badge.classList.add('status-4xx');
        else if (response.status >= 500) badge.classList.add('status-5xx');

        // Update meta info
        document.getElementById('responseTime').textContent = RequestEngine.formatTime(response.time);
        document.getElementById('responseSize').textContent = RequestEngine.formatSize(response.size);

        // Render pretty view
        renderPretty(response);

        // Render raw view
        document.getElementById('rawBody').textContent = response.body;

        // Render headers view
        renderHeaders(response.headers);

        // Make sure pretty tab is active
        switchResponseTab('pretty');
    }

    /**
     * Render pretty-printed response
     */
    function renderPretty(response) {
        const container = document.getElementById('viewPretty');
        const contentType = response.headers['content-type'] || '';

        let prettyContent = '';

        if (contentType.includes('application/json') || isJSON(response.body)) {
            try {
                const parsed = JSON.parse(response.body);
                const formatted = JSON.stringify(parsed, null, 2);
                const highlighted = Prism.highlight(formatted, Prism.languages.json, 'json');
                prettyContent = `<pre class="language-json"><code class="language-json">${highlighted}</code></pre>`;
            } catch (e) {
                prettyContent = `<pre>${escapeHtml(response.body)}</pre>`;
            }
        } else if (contentType.includes('text/html') || contentType.includes('text/xml') || contentType.includes('application/xml')) {
            const highlighted = Prism.highlight(response.body, Prism.languages.markup, 'markup');
            prettyContent = `<pre class="language-markup"><code class="language-markup">${highlighted}</code></pre>`;
        } else {
            prettyContent = `<pre>${escapeHtml(response.body)}</pre>`;
        }

        container.innerHTML = prettyContent;
    }

    /**
     * Render response headers as a table
     */
    function renderHeaders(headers) {
        const container = document.getElementById('responseHeadersTable');
        const entries = Object.entries(headers);

        if (entries.length === 0) {
            container.innerHTML = '<div class="empty-state empty-state--sm"><p>No response headers</p></div>';
            return;
        }

        let html = '<table><thead><tr><th>Header</th><th>Value</th></tr></thead><tbody>';
        entries.forEach(([key, value]) => {
            html += `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    /**
     * Switch response tab
     */
    function switchResponseTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.config-tabs--response .config-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.response === tabName);
        });

        // Update views
        document.querySelectorAll('.response-view').forEach(view => {
            view.classList.remove('active');
        });

        const viewId = {
            'pretty': 'viewPretty',
            'raw': 'viewRaw',
            'headers': 'viewHeaders'
        }[tabName];

        if (viewId) {
            document.getElementById(viewId).classList.add('active');
        }
    }

    /**
     * Show error in response panel
     */
    function showError(error) {
        const container = document.getElementById('viewPretty');
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="#ef4444" stroke-width="1.5" opacity="0.3"/>
                    <path d="M24 16v8M24 28v2" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <p style="color: var(--error);">Request Failed</p>
                <span class="empty-state__sub" style="max-width: 400px;">${escapeHtml(error.message)}</span>
            </div>
        `;

        // Reset status
        const badge = document.getElementById('statusBadge');
        badge.textContent = 'Error';
        badge.className = 'status-badge status-5xx';
        document.getElementById('responseTime').textContent = '—';
        document.getElementById('responseSize').textContent = '—';

        switchResponseTab('pretty');
    }

    /**
     * Clear the response panel
     */
    function clear() {
        currentResponse = null;
        document.getElementById('viewPretty').innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                    <path d="M24 28l8-4 8 4v8l-8 4-8-4v-8z" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
                    <path d="M32 24v12" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                </svg>
                <p>Enter a URL and hit Send</p>
                <span class="empty-state__sub">Response will appear here</span>
            </div>
        `;
        document.getElementById('rawBody').textContent = '';
        document.getElementById('responseHeadersTable').innerHTML = '';
        document.getElementById('statusBadge').textContent = '---';
        document.getElementById('statusBadge').className = 'status-badge';
        document.getElementById('responseTime').textContent = '0 ms';
        document.getElementById('responseSize').textContent = '0 B';
    }

    /**
     * Get current response body
     */
    function getResponseBody() {
        return currentResponse ? currentResponse.body : '';
    }

    function getCurrentResponse() {
        return currentResponse;
    }

    // Helpers
    function isJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    return { display, showError, clear, switchResponseTab, getResponseBody, getCurrentResponse, escapeHtml };
})();
