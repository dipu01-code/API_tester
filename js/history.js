/* ===================================================
   history.js — Request/Response History
   Log, browse, and re-run old requests
   =================================================== */

const History = (() => {
    const STORAGE_KEY = 'reqbench_history';
    const MAX_HISTORY = 100;

    /**
     * Get all history entries
     */
    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Save history
     */
    function saveAll(history) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }

    /**
     * Add a new history entry
     */
    function add(requestConfig, response) {
        const history = getAll();
        const entry = {
            id: Collections.generateId(),
            method: requestConfig.method,
            url: requestConfig.url,
            headers: requestConfig.headers || {},
            body: requestConfig.body || '',
            bodyType: requestConfig.bodyType || 'none',
            auth: requestConfig.auth || { type: 'none' },
            response: {
                status: response.status,
                statusText: response.statusText,
                time: response.time,
                size: response.size
            },
            timestamp: Date.now()
        };

        history.unshift(entry);
        if (history.length > MAX_HISTORY) history.pop();
        saveAll(history);
        renderList();
    }

    /**
     * Clear all history
     */
    function clear() {
        localStorage.removeItem(STORAGE_KEY);
        renderList();
    }

    /**
     * Render history list in sidebar
     */
    function renderList() {
        const container = document.getElementById('historyList');
        const history = getAll();

        if (history.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <circle cx="20" cy="20" r="14" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M20 10v10l6 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                    <p>No history yet</p>
                    <span class="empty-state__sub">Send a request to start logging</span>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(entry => {
            const methodClass = `badge--${entry.method.toLowerCase()}`;
            const statusClass = getStatusClass(entry.response.status);
            const timeAgo = formatTimeAgo(entry.timestamp);
            const shortUrl = truncateUrl(entry.url);

            return `
                <div class="history-item" data-history-id="${entry.id}">
                    <span class="badge ${methodClass}">${entry.method}</span>
                    <div class="history-item__info">
                        <div class="history-item__url">${ResponseViewer.escapeHtml(shortUrl)}</div>
                        <div class="history-item__time">${timeAgo} · ${RequestEngine.formatTime(entry.response.time)}</div>
                    </div>
                    <span class="history-item__status" style="color:var(--${statusClass})">${entry.response.status}</span>
                </div>
            `;
        }).join('');

        // Attach listeners
        container.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.historyId;
                const entry = history.find(e => e.id === id);
                if (entry) App.loadFromHistory(entry);
            });
        });
    }

    function getStatusClass(status) {
        if (status >= 200 && status < 300) return 'success';
        if (status >= 300 && status < 400) return 'info';
        if (status >= 400 && status < 500) return 'warning';
        return 'error';
    }

    function formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    function truncateUrl(url) {
        try {
            const u = new URL(url);
            const path = u.pathname + u.search;
            return u.host + (path.length > 40 ? path.substring(0, 40) + '...' : path);
        } catch (e) {
            return url.length > 60 ? url.substring(0, 60) + '...' : url;
        }
    }

    return { add, clear, renderList, getAll };
})();
