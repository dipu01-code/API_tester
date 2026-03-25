/* ===================================================
   collections.js — Collection Management
   Save/load/organize requests in localStorage
   =================================================== */

const Collections = (() => {
    const STORAGE_KEY = 'reqbench_collections';

    /**
     * Get all collections from localStorage
     */
    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Save all collections to localStorage
     */
    function saveAll(collections) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    }

    /**
     * Create a new collection
     */
    function createCollection(name) {
        const collections = getAll();
        const collection = {
            id: generateId(),
            name: name,
            requests: [],
            createdAt: Date.now()
        };
        collections.push(collection);
        saveAll(collections);
        return collection;
    }

    /**
     * Delete a collection
     */
    function deleteCollection(collectionId) {
        let collections = getAll();
        collections = collections.filter(c => c.id !== collectionId);
        saveAll(collections);
    }

    /**
     * Add a request to a collection
     */
    function addRequest(collectionId, requestData) {
        const collections = getAll();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return null;

        const request = {
            id: generateId(),
            name: requestData.name || 'Untitled Request',
            method: requestData.method || 'GET',
            url: requestData.url || '',
            headers: requestData.headers || [],
            params: requestData.params || [],
            body: requestData.body || '',
            bodyType: requestData.bodyType || 'none',
            auth: requestData.auth || { type: 'none' },
            chainRules: requestData.chainRules || [],
            createdAt: Date.now()
        };

        collection.requests.push(request);
        saveAll(collections);
        return request;
    }

    /**
     * Update an existing request
     */
    function updateRequest(collectionId, requestId, requestData) {
        const collections = getAll();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const idx = collection.requests.findIndex(r => r.id === requestId);
        if (idx === -1) return;

        collection.requests[idx] = { ...collection.requests[idx], ...requestData, updatedAt: Date.now() };
        saveAll(collections);
    }

    /**
     * Delete a request from a collection
     */
    function deleteRequest(collectionId, requestId) {
        const collections = getAll();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        collection.requests = collection.requests.filter(r => r.id !== requestId);
        saveAll(collections);
    }

    /**
     * Get a specific request
     */
    function getRequest(collectionId, requestId) {
        const collections = getAll();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return null;
        return collection.requests.find(r => r.id === requestId) || null;
    }

    /**
     * Render the collections tree in the sidebar
     */
    function renderTree() {
        const container = document.getElementById('collectionsTree');
        const collections = getAll();

        if (collections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                        <rect x="6" y="8" width="28" height="24" rx="3" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M6 14h28" stroke="currentColor" stroke-width="1.2"/>
                        <path d="M12 8V5h8v3" stroke="currentColor" stroke-width="1.2"/>
                    </svg>
                    <p>No collections yet</p>
                    <button class="btn btn--sm btn--primary" id="btnCreateFirstCollection">Create Collection</button>
                </div>
            `;
            const btn = document.getElementById('btnCreateFirstCollection');
            if (btn) btn.addEventListener('click', () => App.showNewCollectionModal());
            return;
        }

        let html = '';
        collections.forEach(collection => {
            const requestItems = collection.requests.map(req => {
                const methodClass = `badge--${req.method.toLowerCase()}`;
                return `
                    <div class="request-item" data-collection-id="${collection.id}" data-request-id="${req.id}">
                        <span class="badge ${methodClass}">${req.method}</span>
                        <span class="request-item__name">${ResponseViewer.escapeHtml(req.name)}</span>
                        <div class="request-item__actions">
                            <button class="btn-delete-request" data-collection-id="${collection.id}" data-request-id="${req.id}" title="Delete">&times;</button>
                        </div>
                    </div>
                `;
            }).join('');

            html += `
                <div class="collection-item" data-collection-id="${collection.id}">
                    <div class="collection-header" data-collection-id="${collection.id}">
                        <span class="collection-header__toggle">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </span>
                        <svg class="collection-header__icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 3.5A1.5 1.5 0 013.5 2h2.38a1.5 1.5 0 011.12.5l.88.96a1.5 1.5 0 001.12.5H10.5A1.5 1.5 0 0112 5.46V10.5A1.5 1.5 0 0110.5 12h-7A1.5 1.5 0 012 10.5V3.5z" fill="currentColor" opacity="0.7"/>
                        </svg>
                        <span class="collection-header__name">${ResponseViewer.escapeHtml(collection.name)}</span>
                        <div class="collection-header__actions">
                            <button class="btn-export-collection" data-collection-id="${collection.id}" title="Export">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 8V1M3 4l3-3 3 3M1 9v1.5A1.5 1.5 0 002.5 12h7A1.5 1.5 0 0011 10.5V9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                            </button>
                            <button class="btn-delete-collection" data-collection-id="${collection.id}" title="Delete">&times;</button>
                        </div>
                    </div>
                    <div class="collection-requests" data-collection-id="${collection.id}">
                        ${requestItems || '<div class="empty-state empty-state--sm"><p style="font-size:11px;color:var(--text-tertiary)">No requests</p></div>'}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        attachTreeListeners();
    }

    /**
     * Attach event listeners to the tree
     */
    function attachTreeListeners() {
        // Toggle collection folders
        document.querySelectorAll('.collection-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('.collection-header__actions')) return;
                const collId = header.dataset.collectionId;
                const requests = document.querySelector(`.collection-requests[data-collection-id="${collId}"]`);
                const toggle = header.querySelector('.collection-header__toggle');
                requests.classList.toggle('open');
                toggle.classList.toggle('open');
            });
        });

        // Click request items
        document.querySelectorAll('.request-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.request-item__actions')) return;
                const collId = item.dataset.collectionId;
                const reqId = item.dataset.requestId;
                App.loadRequest(collId, reqId);
            });
        });

        // Delete request
        document.querySelectorAll('.btn-delete-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const collId = btn.dataset.collectionId;
                const reqId = btn.dataset.requestId;
                deleteRequest(collId, reqId);
                renderTree();
                App.showToast('Request deleted', 'info');
            });
        });

        // Delete collection
        document.querySelectorAll('.btn-delete-collection').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const collId = btn.dataset.collectionId;
                if (confirm('Delete this collection and all its requests?')) {
                    deleteCollection(collId);
                    renderTree();
                    App.showToast('Collection deleted', 'info');
                }
            });
        });

        // Export collection
        document.querySelectorAll('.btn-export-collection').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const collId = btn.dataset.collectionId;
                ImportExport.exportCollection(collId);
            });
        });
    }

    /**
     * Get collection names for dropdown
     */
    function getCollectionOptions() {
        return getAll().map(c => ({ id: c.id, name: c.name }));
    }

    function generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    return {
        getAll, saveAll, createCollection, deleteCollection,
        addRequest, updateRequest, deleteRequest, getRequest,
        renderTree, getCollectionOptions, generateId
    };
})();
