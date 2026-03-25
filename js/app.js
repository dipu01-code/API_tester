/* ===================================================
   app.js — Main Application Controller
   Initialization, event wiring, UI state management
   =================================================== */

const App = (() => {
    // Current request state
    let activeTab = 'default';
    let tabs = new Map();
    let tabCounter = 0;
    let currentRequestMeta = { collectionId: null, requestId: null };

    /**
     * Initialize the app
     */
    function init() {
        // Create default tab state
        tabs.set('default', createEmptyRequest());

        // Initialize UI
        Collections.renderTree();
        History.renderList();
        Environments.populateDropdown();
        Auth.setAuthType('none');
        ImportExport.setupDragDrop();
        updateMethodColor();

        // Wire up events
        bindEvents();

        // Focus URL input
        document.getElementById('urlInput').focus();
    }

    /**
     * Create an empty request state
     */
    function createEmptyRequest() {
        return {
            method: 'GET',
            url: '',
            headers: [],
            params: [],
            body: '',
            bodyType: 'none',
            auth: { type: 'none' },
            chainRules: [],
            name: 'Untitled Request'
        };
    }

    /**
     * Bind all event listeners
     */
    function bindEvents() {
        // Send button
        document.getElementById('btnSend').addEventListener('click', sendRequest);

        // URL input — Enter to send
        document.getElementById('urlInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendRequest();
            }
        });

        // Method dropdown — color change
        document.getElementById('httpMethod').addEventListener('change', () => {
            updateMethodColor();
            updateActiveTabBadge();
        });

        // Config tabs (Params, Headers, Body, Auth, Chain)
        document.querySelectorAll('.config-tab[data-config]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.config-tab[data-config]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`config${capitalize(tab.dataset.config)}`).classList.add('active');
            });
        });

        // Response tabs (Pretty, Raw, Headers)
        document.querySelectorAll('.config-tab[data-response]').forEach(tab => {
            tab.addEventListener('click', () => {
                ResponseViewer.switchResponseTab(tab.dataset.response);
            });
        });

        // Sidebar tabs
        document.querySelectorAll('.sidebar__tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.sidebar__tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.sidebar__panel').forEach(p => p.classList.remove('active'));
                document.getElementById(`panel${capitalize(tab.dataset.panel)}`).classList.add('active');
            });
        });

        // Add header / param buttons
        document.getElementById('btnAddHeader').addEventListener('click', () => HeadersManager.addHeaderRow());
        document.getElementById('btnAddParam').addEventListener('click', () => HeadersManager.addParamRow());

        // Body type radio buttons
        document.querySelectorAll('input[name="bodyType"]').forEach(radio => {
            radio.addEventListener('change', () => handleBodyTypeChange(radio.value));
        });

        // Auth type dropdown
        document.getElementById('authType').addEventListener('change', (e) => {
            Auth.setAuthType(e.target.value);
        });

        // Chain rules
        document.getElementById('btnAddChainRule').addEventListener('click', () => Chaining.addRule());

        // Save request
        document.getElementById('btnSaveRequest').addEventListener('click', () => showSaveModal());
        document.getElementById('btnConfirmSave').addEventListener('click', () => saveCurrentRequest());

        // New collection
        document.getElementById('btnNewCollection').addEventListener('click', () => showNewCollectionModal());
        document.getElementById('btnCreateFirstCollection')?.addEventListener('click', () => showNewCollectionModal());
        document.getElementById('btnConfirmNewCollection').addEventListener('click', () => createNewCollection());

        // Environment
        document.getElementById('envDropdown').addEventListener('change', (e) => {
            Environments.setActive(e.target.value);
        });
        document.getElementById('btnManageEnvs').addEventListener('click', () => {
            document.getElementById('modalEnvManager').classList.remove('hidden');
            Environments.renderManager(null);
        });
        document.getElementById('btnNewEnv').addEventListener('click', () => {
            const name = prompt('Environment name:');
            if (name && name.trim()) {
                const env = Environments.create(name.trim());
                Environments.renderManager(env.id);
                Environments.populateDropdown();
            }
        });
        document.getElementById('btnSaveEnvs').addEventListener('click', () => {
            Environments.saveEditorState();
            document.getElementById('modalEnvManager').classList.add('hidden');
            showToast('Environments saved', 'success');
        });

        // Code generation
        document.getElementById('btnCodeGen').addEventListener('click', () => {
            const config = collectRequestConfig();
            CodeGen.showModal(config);
        });

        // Copy response
        document.getElementById('btnCopyResponse').addEventListener('click', () => {
            const body = ResponseViewer.getResponseBody();
            if (body) {
                navigator.clipboard.writeText(body).then(() => showToast('Response copied', 'success'));
            }
        });

        // Import
        document.getElementById('btnImport').addEventListener('click', () => {
            document.getElementById('modalImport').classList.remove('hidden');
        });

        // History clear
        document.getElementById('btnClearHistory').addEventListener('click', () => {
            if (confirm('Clear all history?')) {
                History.clear();
                showToast('History cleared', 'info');
            }
        });

        // New tab
        document.getElementById('btnNewTab').addEventListener('click', () => addNewTab());

        // Modal close buttons
        document.querySelectorAll('.modal__close, .modal__cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal-overlay').classList.add('hidden');
            });
        });

        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.add('hidden');
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter: Send
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                sendRequest();
            }
            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                showSaveModal();
            }
            // Ctrl/Cmd + N: New tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                addNewTab();
            }
            // Escape: Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
            }
        });

        // Sidebar resize
        setupSidebarResize();

        // Split pane resize
        setupSplitResize();

        // Form data fields
        document.getElementById('btnAddFormData')?.addEventListener('click', () => addFormDataRow());
    }

    /**
     * Send the current request
     */
    async function sendRequest() {
        const config = collectRequestConfig();

        if (!config.url) {
            showToast('Please enter a URL', 'error');
            document.getElementById('urlInput').focus();
            return;
        }

        // Ensure URL has protocol
        if (!config.url.match(/^https?:\/\//)) {
            config.url = 'https://' + config.url;
            document.getElementById('urlInput').value = config.url;
        }

        // Replace environment variables
        config.url = Environments.replaceVariables(config.url);
        if (config.body) {
            config.body = Environments.replaceVariables(config.body);
        }
        Object.keys(config.headers).forEach(key => {
            config.headers[key] = Environments.replaceVariables(config.headers[key]);
        });

        // Add auth headers
        const authHeaders = Auth.getAuthHeaders();
        Object.assign(config.headers, authHeaders);

        // Add auth query params if any
        const authParams = Auth.getAuthQueryParams();
        if (Object.keys(authParams).length > 0) {
            try {
                const url = new URL(config.url);
                Object.entries(authParams).forEach(([k, v]) => url.searchParams.set(k, v));
                config.url = url.toString();
            } catch (e) { /* ignore */ }
        }

        // Build URL with query params
        config.url = HeadersManager.buildUrlWithParams(config.url);

        // Show loading
        const loading = document.getElementById('responseLoading');
        loading.classList.remove('hidden');
        document.getElementById('btnSend').classList.add('loading');

        try {
            const response = await RequestEngine.send(config);
            ResponseViewer.display(response);

            // Process chaining rules
            Chaining.processRules(response.body);

            // Add to history
            History.add(config, response);
        } catch (error) {
            ResponseViewer.showError(error);
        } finally {
            loading.classList.add('hidden');
            document.getElementById('btnSend').classList.remove('loading');
        }
    }

    /**
     * Collect current request configuration from the UI
     */
    function collectRequestConfig() {
        const method = document.getElementById('httpMethod').value;
        const url = document.getElementById('urlInput').value.trim();
        const headers = HeadersManager.getHeaders();
        const bodyType = document.querySelector('input[name="bodyType"]:checked').value;

        let body = null;
        if (bodyType === 'json' || bodyType === 'text' || bodyType === 'urlencoded') {
            body = document.getElementById('bodyTextarea').value;
        } else if (bodyType === 'formdata') {
            body = collectFormData();
        }

        return { method, url, headers, body, bodyType };
    }

    /**
     * Collect form data
     */
    function collectFormData() {
        const formData = new FormData();
        document.querySelectorAll('#formDataRows .kv-row').forEach(row => {
            const key = row.querySelector('.kv-row__key').value.trim();
            const value = row.querySelector('.kv-row__value').value;
            if (key) formData.append(key, value);
        });
        return formData;
    }

    /**
     * Handle body type change
     */
    function handleBodyTypeChange(type) {
        const textarea = document.getElementById('bodyTextarea');
        const noneMsg = document.querySelector('.body-none-message');
        const formDataEditor = document.getElementById('formDataEditor');

        textarea.classList.add('hidden');
        noneMsg.style.display = 'none';
        formDataEditor.classList.add('hidden');

        switch (type) {
            case 'none':
                noneMsg.style.display = 'block';
                break;
            case 'json':
            case 'text':
            case 'urlencoded':
                textarea.classList.remove('hidden');
                if (type === 'json') {
                    textarea.placeholder = '{\n  "key": "value"\n}';
                } else if (type === 'urlencoded') {
                    textarea.placeholder = 'key1=value1&key2=value2';
                } else {
                    textarea.placeholder = 'Enter text body...';
                }
                break;
            case 'formdata':
                formDataEditor.classList.remove('hidden');
                if (document.querySelectorAll('#formDataRows .kv-row').length === 0) {
                    addFormDataRow();
                }
                break;
        }
    }

    /**
     * Add a form data row
     */
    function addFormDataRow(key = '', value = '') {
        const container = document.getElementById('formDataRows');
        const row = document.createElement('div');
        row.className = 'kv-row';
        row.innerHTML = `
            <input type="checkbox" class="kv-row__toggle" checked>
            <input type="text" class="kv-row__key" placeholder="Key" value="${ResponseViewer.escapeHtml(key)}" spellcheck="false">
            <input type="text" class="kv-row__value" placeholder="Value" value="${ResponseViewer.escapeHtml(value)}" spellcheck="false">
            <button class="kv-row__delete" title="Remove">&times;</button>
        `;
        row.querySelector('.kv-row__delete').addEventListener('click', () => row.remove());
        container.appendChild(row);
    }

    /**
     * Update method dropdown color based on selected method
     */
    function updateMethodColor() {
        const select = document.getElementById('httpMethod');
        const method = select.value.toLowerCase();
        const colors = {
            get: 'var(--method-get)',
            post: 'var(--method-post)',
            put: 'var(--method-put)',
            patch: 'var(--method-patch)',
            delete: 'var(--method-delete)',
            head: 'var(--method-head)',
            options: 'var(--method-options)'
        };
        select.style.color = colors[method] || 'var(--text-primary)';
    }

    /**
     * Update active tab badge
     */
    function updateActiveTabBadge() {
        const method = document.getElementById('httpMethod').value;
        const tab = document.querySelector(`.request-tab[data-tab-id="${activeTab}"]`);
        if (tab) {
            const badge = tab.querySelector('.request-tab__method');
            badge.textContent = method;
            badge.className = `request-tab__method badge badge--${method.toLowerCase()}`;
        }
    }

    // ===== TAB MANAGEMENT =====

    function addNewTab() {
        tabCounter++;
        const tabId = `tab_${tabCounter}`;
        tabs.set(tabId, createEmptyRequest());

        // Save current tab state
        saveTabState(activeTab);

        // Create tab element
        const tabsContainer = document.getElementById('requestTabs');
        const addBtn = document.getElementById('btnNewTab');
        const tabEl = document.createElement('div');
        tabEl.className = 'request-tab';
        tabEl.dataset.tabId = tabId;
        tabEl.innerHTML = `
            <span class="request-tab__method badge badge--get">GET</span>
            <span class="request-tab__name">Untitled Request</span>
            <button class="request-tab__close" title="Close tab">&times;</button>
        `;

        // Tab click
        tabEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('request-tab__close')) return;
            switchTab(tabId);
        });

        // Close tab
        tabEl.querySelector('.request-tab__close').addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tabId);
        });

        tabsContainer.insertBefore(tabEl, addBtn);
        switchTab(tabId);
    }

    function switchTab(tabId) {
        // Save current tab state
        saveTabState(activeTab);

        activeTab = tabId;

        // Highlight tab
        document.querySelectorAll('.request-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tabId === tabId);
        });

        // Load tab state
        loadTabState(tabId);
    }

    function closeTab(tabId) {
        if (tabs.size <= 1) return; // Don't close last tab

        tabs.delete(tabId);
        const tabEl = document.querySelector(`.request-tab[data-tab-id="${tabId}"]`);
        if (tabEl) tabEl.remove();

        if (activeTab === tabId) {
            const firstTabId = tabs.keys().next().value;
            switchTab(firstTabId);
        }
    }

    function saveTabState(tabId) {
        const state = {
            method: document.getElementById('httpMethod').value,
            url: document.getElementById('urlInput').value,
            body: document.getElementById('bodyTextarea').value,
            bodyType: document.querySelector('input[name="bodyType"]:checked').value,
            headers: HeadersManager.getHeadersArray(),
            params: HeadersManager.getParamsArray(),
            auth: Auth.getCurrentAuth(),
            chainRules: Chaining.getRules(),
            name: document.querySelector(`.request-tab[data-tab-id="${tabId}"] .request-tab__name`)?.textContent || 'Untitled Request'
        };
        tabs.set(tabId, state);
    }

    function loadTabState(tabId) {
        const state = tabs.get(tabId) || createEmptyRequest();

        document.getElementById('httpMethod').value = state.method || 'GET';
        document.getElementById('urlInput').value = state.url || '';
        document.getElementById('bodyTextarea').value = state.body || '';

        // Body type
        const bodyType = state.bodyType || 'none';
        document.querySelector(`input[name="bodyType"][value="${bodyType}"]`).checked = true;
        handleBodyTypeChange(bodyType);

        // Headers
        if (state.headers && state.headers.length > 0) {
            const container = document.getElementById('headersRows');
            container.innerHTML = '';
            state.headers.forEach(h => HeadersManager.addHeaderRow(h.key, h.value, h.enabled));
        } else {
            HeadersManager.setHeaders({});
        }

        // Params
        if (state.params && state.params.length > 0) {
            const container = document.getElementById('paramsRows');
            container.innerHTML = '';
            state.params.forEach(p => HeadersManager.addParamRow(p.key, p.value, p.enabled));
        } else {
            HeadersManager.setParams({});
        }

        // Auth
        Auth.loadAuth(state.auth);

        // Chain rules
        Chaining.loadRules(state.chainRules);

        updateMethodColor();
        ResponseViewer.clear();
    }

    // ===== SAVE REQUEST =====

    function showSaveModal() {
        const modal = document.getElementById('modalSaveRequest');
        const collectionSelect = document.getElementById('saveRequestCollection');

        // Populate collection dropdown
        const options = Collections.getCollectionOptions();
        let html = '<option value="">— Select Collection —</option>';
        options.forEach(opt => {
            html += `<option value="${opt.id}">${ResponseViewer.escapeHtml(opt.name)}</option>`;
        });
        collectionSelect.innerHTML = html;

        // Pre-fill name with URL or tab name
        const name = document.getElementById('urlInput').value || 'Untitled Request';
        document.getElementById('saveRequestName').value =
            currentRequestMeta.requestId
                ? (tabs.get(activeTab)?.name || name)
                : name;

        modal.classList.remove('hidden');
        document.getElementById('saveRequestName').focus();
    }

    function saveCurrentRequest() {
        const name = document.getElementById('saveRequestName').value.trim();
        const collectionId = document.getElementById('saveRequestCollection').value;

        if (!name) {
            showToast('Please enter a request name', 'error');
            return;
        }
        if (!collectionId) {
            showToast('Please select a collection', 'error');
            return;
        }

        const config = {
            name,
            method: document.getElementById('httpMethod').value,
            url: document.getElementById('urlInput').value,
            headers: HeadersManager.getHeadersArray(),
            params: HeadersManager.getParamsArray(),
            body: document.getElementById('bodyTextarea').value,
            bodyType: document.querySelector('input[name="bodyType"]:checked').value,
            auth: Auth.getCurrentAuth(),
            chainRules: Chaining.getRules()
        };

        if (currentRequestMeta.requestId && currentRequestMeta.collectionId === collectionId) {
            Collections.updateRequest(collectionId, currentRequestMeta.requestId, config);
            showToast('Request updated', 'success');
        } else {
            const req = Collections.addRequest(collectionId, config);
            currentRequestMeta = { collectionId, requestId: req.id };
            showToast('Request saved', 'success');
        }

        Collections.renderTree();
        document.getElementById('modalSaveRequest').classList.add('hidden');

        // Update tab name
        const tab = document.querySelector(`.request-tab[data-tab-id="${activeTab}"] .request-tab__name`);
        if (tab) tab.textContent = name;
    }

    // ===== COLLECTIONS =====

    function showNewCollectionModal() {
        document.getElementById('modalNewCollection').classList.remove('hidden');
        document.getElementById('newCollectionName').value = '';
        document.getElementById('newCollectionName').focus();
    }

    function createNewCollection() {
        const name = document.getElementById('newCollectionName').value.trim();
        if (!name) {
            showToast('Please enter a collection name', 'error');
            return;
        }
        Collections.createCollection(name);
        Collections.renderTree();
        document.getElementById('modalNewCollection').classList.add('hidden');
        showToast(`Collection "${name}" created`, 'success');
    }

    // ===== LOAD REQUEST =====

    function loadRequest(collectionId, requestId) {
        const req = Collections.getRequest(collectionId, requestId);
        if (!req) return;

        currentRequestMeta = { collectionId, requestId };

        document.getElementById('httpMethod').value = req.method || 'GET';
        document.getElementById('urlInput').value = req.url || '';
        document.getElementById('bodyTextarea').value = req.body || '';

        // Body type
        const bodyType = req.bodyType || 'none';
        document.querySelector(`input[name="bodyType"][value="${bodyType}"]`).checked = true;
        handleBodyTypeChange(bodyType);

        // Headers
        if (req.headers && Array.isArray(req.headers) && req.headers.length > 0) {
            const container = document.getElementById('headersRows');
            container.innerHTML = '';
            req.headers.forEach(h => HeadersManager.addHeaderRow(h.key, h.value, h.enabled !== false));
        } else if (req.headers && typeof req.headers === 'object' && !Array.isArray(req.headers)) {
            HeadersManager.setHeaders(req.headers);
        } else {
            HeadersManager.setHeaders({});
        }

        // Params
        if (req.params && Array.isArray(req.params)) {
            const container = document.getElementById('paramsRows');
            container.innerHTML = '';
            req.params.forEach(p => HeadersManager.addParamRow(p.key, p.value, p.enabled !== false));
        } else {
            HeadersManager.setParams({});
        }

        // Auth
        Auth.loadAuth(req.auth);

        // Chain rules
        Chaining.loadRules(req.chainRules);

        updateMethodColor();
        updateActiveTabBadge();
        ResponseViewer.clear();

        // Update tab name
        const tab = document.querySelector(`.request-tab[data-tab-id="${activeTab}"] .request-tab__name`);
        if (tab) tab.textContent = req.name || 'Untitled Request';

        // Highlight in sidebar
        document.querySelectorAll('.request-item').forEach(item => {
            item.classList.toggle('active',
                item.dataset.collectionId === collectionId && item.dataset.requestId === requestId);
        });

        showToast(`Loaded: ${req.name}`, 'info');
    }

    function loadFromHistory(entry) {
        currentRequestMeta = { collectionId: null, requestId: null };

        document.getElementById('httpMethod').value = entry.method || 'GET';
        document.getElementById('urlInput').value = entry.url || '';
        document.getElementById('bodyTextarea').value = entry.body || '';

        const bodyType = entry.bodyType || 'none';
        document.querySelector(`input[name="bodyType"][value="${bodyType}"]`).checked = true;
        handleBodyTypeChange(bodyType);

        if (entry.headers && typeof entry.headers === 'object') {
            HeadersManager.setHeaders(entry.headers);
        }

        Auth.loadAuth(entry.auth);

        updateMethodColor();
        updateActiveTabBadge();
        ResponseViewer.clear();
        showToast('Loaded from history', 'info');
    }

    // ===== SIDEBAR RESIZE =====

    function setupSidebarResize() {
        const handle = document.getElementById('sidebarResize');
        const sidebar = document.getElementById('sidebar');
        let startX, startWidth;

        handle.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (e) => {
                const diff = e.clientX - startX;
                const newWidth = Math.max(200, Math.min(500, startWidth + diff));
                sidebar.style.width = newWidth + 'px';
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // ===== SPLIT PANE RESIZE =====

    function setupSplitResize() {
        const handle = document.getElementById('splitHandle');
        const splitPane = document.getElementById('splitPane');
        const requestPanel = splitPane.querySelector('.panel--request');
        const responsePanel = splitPane.querySelector('.panel--response');

        handle.addEventListener('mousedown', (e) => {
            const startX = e.clientX;
            const totalWidth = splitPane.offsetWidth;
            const startReqWidth = requestPanel.offsetWidth;

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (e) => {
                const diff = e.clientX - startX;
                const newReqWidth = startReqWidth + diff;
                const reqPercent = (newReqWidth / totalWidth) * 100;

                if (reqPercent > 25 && reqPercent < 75) {
                    requestPanel.style.flex = 'none';
                    requestPanel.style.width = reqPercent + '%';
                    responsePanel.style.flex = '1';
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // ===== TOAST NOTIFICATIONS =====

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const icons = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        toast.innerHTML = `<span style="font-weight:600">${icons[type] || 'ℹ'}</span> ${ResponseViewer.escapeHtml(message)}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ===== HELPERS =====

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Public API
    return {
        init,
        showToast,
        loadRequest,
        loadFromHistory,
        showNewCollectionModal,
        collectRequestConfig
    };
})();

// ===== BOOT =====
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
