/* ===================================================
   environments.js — Environment Variable System
   Define, switch, and replace {{variables}}
   =================================================== */

const Environments = (() => {
    const STORAGE_KEY = 'reqbench_environments';
    const ACTIVE_KEY = 'reqbench_active_env';

    /**
     * Get all environments
     */
    function getAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Save all environments
     */
    function saveAll(envs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(envs));
    }

    /**
     * Get active environment ID
     */
    function getActiveId() {
        return localStorage.getItem(ACTIVE_KEY) || '';
    }

    /**
     * Set active environment
     */
    function setActive(envId) {
        localStorage.setItem(ACTIVE_KEY, envId || '');
    }

    /**
     * Get active environment variables
     */
    function getActiveVariables() {
        const activeId = getActiveId();
        if (!activeId) return {};
        const envs = getAll();
        const env = envs.find(e => e.id === activeId);
        return env ? env.variables : {};
    }

    /**
     * Create a new environment
     */
    function create(name) {
        const envs = getAll();
        const env = {
            id: Collections.generateId(),
            name: name,
            variables: {}
        };
        envs.push(env);
        saveAll(envs);
        return env;
    }

    /**
     * Delete an environment
     */
    function remove(envId) {
        let envs = getAll();
        envs = envs.filter(e => e.id !== envId);
        saveAll(envs);
        if (getActiveId() === envId) {
            setActive('');
        }
    }

    /**
     * Update environment variables
     */
    function updateVariables(envId, variables) {
        const envs = getAll();
        const env = envs.find(e => e.id === envId);
        if (env) {
            env.variables = variables;
            saveAll(envs);
        }
    }

    /**
     * Replace {{variable}} placeholders in a string
     */
    function replaceVariables(str) {
        if (!str) return str;
        const vars = getActiveVariables();

        // Also include chaining variables
        const chainVars = Chaining.getVariables();
        const allVars = { ...vars, ...chainVars };

        return str.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            return allVars.hasOwnProperty(varName) ? allVars[varName] : match;
        });
    }

    /**
     * Populate the environment dropdown
     */
    function populateDropdown() {
        const select = document.getElementById('envDropdown');
        const activeId = getActiveId();
        const envs = getAll();

        let html = '<option value="">No Environment</option>';
        envs.forEach(env => {
            const selected = env.id === activeId ? 'selected' : '';
            html += `<option value="${env.id}" ${selected}>${ResponseViewer.escapeHtml(env.name)}</option>`;
        });
        select.innerHTML = html;
    }

    /**
     * Render the environment manager modal content
     */
    function renderManager(selectedEnvId) {
        const envs = getAll();
        const listContainer = document.getElementById('envList');
        const editorContainer = document.getElementById('envEditor');

        // Render list
        if (envs.length === 0) {
            listContainer.innerHTML = '<div class="empty-state empty-state--sm"><p>No environments</p></div>';
        } else {
            listContainer.innerHTML = envs.map(env => `
                <div class="env-manager__item ${env.id === selectedEnvId ? 'active' : ''}" data-env-id="${env.id}">
                    <span>${ResponseViewer.escapeHtml(env.name)}</span>
                    <button data-env-id="${env.id}" title="Delete">&times;</button>
                </div>
            `).join('');

            // Attach listeners
            listContainer.querySelectorAll('.env-manager__item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON') {
                        remove(e.target.dataset.envId);
                        renderManager(null);
                        populateDropdown();
                        return;
                    }
                    renderManager(item.dataset.envId);
                });
            });
        }

        // Render editor
        if (!selectedEnvId) {
            editorContainer.innerHTML = '<div class="empty-state"><p>Select an environment to edit</p></div>';
            return;
        }

        const env = envs.find(e => e.id === selectedEnvId);
        if (!env) return;

        const vars = env.variables || {};
        const entries = Object.entries(vars);

        let html = `
            <div style="margin-bottom: var(--space-md);">
                <label style="font-size:11px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
                    Variables for "${ResponseViewer.escapeHtml(env.name)}"
                </label>
            </div>
        `;

        const renderRow = (key, value) => `
            <div class="env-var-row">
                <input type="text" class="env-var-key" placeholder="Variable name" value="${ResponseViewer.escapeHtml(key)}" spellcheck="false">
                <input type="text" class="env-var-value" placeholder="Value" value="${ResponseViewer.escapeHtml(value)}" spellcheck="false">
                <button class="env-var-delete" title="Remove">&times;</button>
            </div>
        `;

        if (entries.length > 0) {
            html += entries.map(([k, v]) => renderRow(k, v)).join('');
        } else {
            html += renderRow('', '');
        }

        html += `<button class="btn btn--sm btn--ghost" id="btnAddEnvVar" style="margin-top:var(--space-sm)">+ Add Variable</button>`;

        editorContainer.innerHTML = html;
        editorContainer.dataset.envId = selectedEnvId;

        // Add variable button
        document.getElementById('btnAddEnvVar').addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'env-var-row';
            row.innerHTML = `
                <input type="text" class="env-var-key" placeholder="Variable name" spellcheck="false">
                <input type="text" class="env-var-value" placeholder="Value" spellcheck="false">
                <button class="env-var-delete" title="Remove">&times;</button>
            `;
            row.querySelector('.env-var-delete').addEventListener('click', () => row.remove());
            editorContainer.insertBefore(row, document.getElementById('btnAddEnvVar'));
        });

        // Delete buttons
        editorContainer.querySelectorAll('.env-var-delete').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.env-var-row').remove());
        });
    }

    /**
     * Save current environment editor state
     */
    function saveEditorState() {
        const editor = document.getElementById('envEditor');
        const envId = editor.dataset.envId;
        if (!envId) return;

        const variables = {};
        editor.querySelectorAll('.env-var-row').forEach(row => {
            const key = row.querySelector('.env-var-key').value.trim();
            const value = row.querySelector('.env-var-value').value;
            if (key) {
                variables[key] = value;
            }
        });

        updateVariables(envId, variables);
        populateDropdown();
    }

    return {
        getAll, saveAll, getActiveId, setActive, getActiveVariables,
        create, remove, updateVariables, replaceVariables,
        populateDropdown, renderManager, saveEditorState
    };
})();
