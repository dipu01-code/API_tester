/* ===================================================
   headers.js — Custom Headers Management
   Dynamic key-value input rows
   =================================================== */

const HeadersManager = (() => {
    let headerCounter = 1;
    let paramCounter = 1;

    /**
     * Add a new header row
     */
    function addHeaderRow(key = '', value = '', enabled = true) {
        const container = document.getElementById('headersRows');
        const id = `h${headerCounter++}`;
        const row = createKVRow(id, key, value, enabled, 'Header name', 'Header value');
        container.appendChild(row);
        if (!key) row.querySelector('.kv-row__key').focus();
    }

    /**
     * Add a new param row
     */
    function addParamRow(key = '', value = '', enabled = true) {
        const container = document.getElementById('paramsRows');
        const id = `p${paramCounter++}`;
        const row = createKVRow(id, key, value, enabled, 'Key', 'Value');
        container.appendChild(row);
        if (!key) row.querySelector('.kv-row__key').focus();
    }

    /**
     * Create a key-value row element
     */
    function createKVRow(id, key, value, enabled, keyPlaceholder, valuePlaceholder) {
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.dataset.rowId = id;
        row.innerHTML = `
            <input type="checkbox" class="kv-row__toggle" ${enabled ? 'checked' : ''}>
            <input type="text" class="kv-row__key" placeholder="${keyPlaceholder}" value="${ResponseViewer.escapeHtml(key)}" spellcheck="false">
            <input type="text" class="kv-row__value" placeholder="${valuePlaceholder}" value="${ResponseViewer.escapeHtml(value)}" spellcheck="false">
            <button class="kv-row__delete" title="Remove">&times;</button>
        `;

        // Delete handler
        row.querySelector('.kv-row__delete').addEventListener('click', () => {
            row.style.animation = 'none';
            row.style.opacity = '0';
            row.style.transform = 'translateX(10px)';
            row.style.transition = 'all 0.15s ease';
            setTimeout(() => row.remove(), 150);
        });

        return row;
    }

    /**
     * Collect all enabled headers from the headers panel
     */
    function getHeaders() {
        const headers = {};
        document.querySelectorAll('#headersRows .kv-row').forEach(row => {
            const enabled = row.querySelector('.kv-row__toggle').checked;
            const key = row.querySelector('.kv-row__key').value.trim();
            const value = row.querySelector('.kv-row__value').value.trim();
            if (enabled && key) {
                headers[key] = value;
            }
        });
        return headers;
    }

    /**
     * Collect all enabled query parameters
     */
    function getParams() {
        const params = {};
        document.querySelectorAll('#paramsRows .kv-row').forEach(row => {
            const enabled = row.querySelector('.kv-row__toggle').checked;
            const key = row.querySelector('.kv-row__key').value.trim();
            const value = row.querySelector('.kv-row__value').value.trim();
            if (enabled && key) {
                params[key] = value;
            }
        });
        return params;
    }

    /**
     * Build URL with query parameters
     */
    function buildUrlWithParams(baseUrl) {
        const params = getParams();
        const entries = Object.entries(params);
        if (entries.length === 0) return baseUrl;

        try {
            const url = new URL(baseUrl);
            entries.forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
            return url.toString();
        } catch (e) {
            // If URL is invalid, append manually
            const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
            const separator = baseUrl.includes('?') ? '&' : '?';
            return baseUrl + separator + qs;
        }
    }

    /**
     * Set headers from an object (used when loading saved requests)
     */
    function setHeaders(headersObj) {
        const container = document.getElementById('headersRows');
        container.innerHTML = '';
        if (headersObj && Object.keys(headersObj).length > 0) {
            Object.entries(headersObj).forEach(([key, value]) => {
                addHeaderRow(key, value, true);
            });
        } else {
            addHeaderRow();
        }
    }

    /**
     * Set params from an object
     */
    function setParams(paramsObj) {
        const container = document.getElementById('paramsRows');
        container.innerHTML = '';
        if (paramsObj && Object.keys(paramsObj).length > 0) {
            Object.entries(paramsObj).forEach(([key, value]) => {
                addParamRow(key, value, true);
            });
        } else {
            addParamRow();
        }
    }

    /**
     * Get headers as an array of { key, value, enabled } objects (for saving)
     */
    function getHeadersArray() {
        const arr = [];
        document.querySelectorAll('#headersRows .kv-row').forEach(row => {
            const enabled = row.querySelector('.kv-row__toggle').checked;
            const key = row.querySelector('.kv-row__key').value.trim();
            const value = row.querySelector('.kv-row__value').value.trim();
            if (key || value) {
                arr.push({ key, value, enabled });
            }
        });
        return arr;
    }

    /**
     * Get params as an array of { key, value, enabled } objects (for saving)
     */
    function getParamsArray() {
        const arr = [];
        document.querySelectorAll('#paramsRows .kv-row').forEach(row => {
            const enabled = row.querySelector('.kv-row__toggle').checked;
            const key = row.querySelector('.kv-row__key').value.trim();
            const value = row.querySelector('.kv-row__value').value.trim();
            if (key || value) {
                arr.push({ key, value, enabled });
            }
        });
        return arr;
    }

    return {
        addHeaderRow, addParamRow,
        getHeaders, getParams,
        buildUrlWithParams,
        setHeaders, setParams,
        getHeadersArray, getParamsArray
    };
})();
