/* ===================================================
   importexport.js — Import/Export Collections
   Export as JSON, import JSON & Postman formats
   =================================================== */

const ImportExport = (() => {

    /**
     * Export a single collection as JSON
     */
    function exportCollection(collectionId) {
        const collections = Collections.getAll();
        const collection = collections.find(c => c.id === collectionId);
        if (!collection) return;

        const data = {
            format: 'reqbench_v1',
            exportedAt: new Date().toISOString(),
            collection: collection
        };

        downloadJSON(data, `${collection.name.replace(/\s+/g, '_').toLowerCase()}.json`);
        App.showToast('Collection exported', 'success');
    }

    /**
     * Export all collections
     */
    function exportAll() {
        const collections = Collections.getAll();
        const data = {
            format: 'reqbench_v1',
            exportedAt: new Date().toISOString(),
            collections: collections
        };

        downloadJSON(data, 'reqbench_collections.json');
        App.showToast('All collections exported', 'success');
    }

    /**
     * Import from a JSON file
     */
    function importFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                processImport(data);
            } catch (err) {
                App.showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Process imported data
     */
    function processImport(data) {
        // ReqBench format
        if (data.format === 'reqbench_v1') {
            if (data.collection) {
                importReqBenchCollection(data.collection);
            } else if (data.collections) {
                data.collections.forEach(col => importReqBenchCollection(col));
            }
            App.showToast('Collection imported successfully', 'success');
            Collections.renderTree();
            closeImportModal();
            return;
        }

        // Postman Collection v2.1 format
        if (data.info && data.info.schema && data.info.schema.includes('collection')) {
            importPostmanCollection(data);
            App.showToast('Postman collection imported successfully', 'success');
            Collections.renderTree();
            closeImportModal();
            return;
        }

        // Try to detect generic format
        if (data.item || data.requests) {
            importPostmanCollection(data);
            App.showToast('Collection imported', 'success');
            Collections.renderTree();
            closeImportModal();
            return;
        }

        App.showToast('Unrecognized collection format', 'error');
    }

    /**
     * Import a ReqBench collection
     */
    function importReqBenchCollection(colData) {
        const collections = Collections.getAll();
        // Generate new IDs to avoid conflicts
        const newCol = {
            ...colData,
            id: Collections.generateId(),
            requests: (colData.requests || []).map(r => ({
                ...r,
                id: Collections.generateId()
            }))
        };
        collections.push(newCol);
        Collections.saveAll(collections);
    }

    /**
     * Import a Postman Collection (v2.1)
     */
    function importPostmanCollection(postmanData) {
        const name = (postmanData.info && postmanData.info.name) || 'Imported Collection';
        const collection = Collections.createCollection(name);

        const items = postmanData.item || [];
        items.forEach(item => {
            if (item.request) {
                const req = parsePostmanRequest(item);
                Collections.addRequest(collection.id, req);
            }
            // Handle nested folders
            if (item.item) {
                item.item.forEach(subItem => {
                    if (subItem.request) {
                        const req = parsePostmanRequest(subItem);
                        req.name = `${item.name || 'Folder'} / ${req.name}`;
                        Collections.addRequest(collection.id, req);
                    }
                });
            }
        });
    }

    /**
     * Parse a Postman request item
     */
    function parsePostmanRequest(item) {
        const request = item.request;
        const method = typeof request.method === 'string' ? request.method : 'GET';

        // Parse URL
        let url = '';
        if (typeof request.url === 'string') {
            url = request.url;
        } else if (request.url && request.url.raw) {
            url = request.url.raw;
        }

        // Parse headers
        const headers = [];
        if (Array.isArray(request.header)) {
            request.header.forEach(h => {
                headers.push({
                    key: h.key || '',
                    value: h.value || '',
                    enabled: !h.disabled
                });
            });
        }

        // Parse body
        let body = '';
        let bodyType = 'none';
        if (request.body) {
            if (request.body.mode === 'raw') {
                body = request.body.raw || '';
                bodyType = 'text';
                if (request.body.options && request.body.options.raw && request.body.options.raw.language === 'json') {
                    bodyType = 'json';
                }
            } else if (request.body.mode === 'urlencoded') {
                bodyType = 'urlencoded';
                if (Array.isArray(request.body.urlencoded)) {
                    body = request.body.urlencoded
                        .filter(p => !p.disabled)
                        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
                        .join('&');
                }
            }
        }

        return {
            name: item.name || 'Untitled',
            method: method,
            url: url,
            headers: headers,
            body: body,
            bodyType: bodyType,
            auth: { type: 'none' }
        };
    }

    /**
     * Download JSON as file
     */
    function downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function closeImportModal() {
        document.getElementById('modalImport').classList.add('hidden');
    }

    /**
     * Setup drag and drop for import
     */
    function setupDragDrop() {
        const dropzone = document.getElementById('importDropzone');
        const fileInput = document.getElementById('importFileInput');

        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) importFile(file);
        });

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) importFile(file);
            fileInput.value = '';
        });
    }

    return { exportCollection, exportAll, importFile, setupDragDrop };
})();
