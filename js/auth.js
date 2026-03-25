/* ===================================================
   auth.js — Authentication Helpers
   Bearer Token, Basic Auth, API Key
   =================================================== */

const Auth = (() => {
    let currentAuth = { type: 'none' };

    /**
     * Set the auth type and render fields
     */
    function setAuthType(type) {
        currentAuth.type = type;
        renderFields(type);
    }

    /**
     * Render auth fields based on type
     */
    function renderFields(type) {
        const container = document.getElementById('authFields');

        switch (type) {
            case 'none':
                container.innerHTML = '<div class="auth-none-message">This request does not use any authorization.</div>';
                break;

            case 'bearer':
                container.innerHTML = `
                    <div class="auth-field">
                        <label>Token</label>
                        <input type="text" id="authBearerToken" placeholder="Enter your bearer token" value="${ResponseViewer.escapeHtml(currentAuth.token || '')}" spellcheck="false">
                    </div>
                    <p style="font-size:11px;color:var(--text-tertiary);margin-top:var(--space-sm)">
                        The token will be sent as: <code style="color:var(--accent-secondary)">Authorization: Bearer &lt;token&gt;</code>
                    </p>
                `;
                break;

            case 'basic':
                container.innerHTML = `
                    <div class="auth-field">
                        <label>Username</label>
                        <input type="text" id="authBasicUser" placeholder="Username" value="${ResponseViewer.escapeHtml(currentAuth.username || '')}" spellcheck="false">
                    </div>
                    <div class="auth-field">
                        <label>Password</label>
                        <input type="password" id="authBasicPass" placeholder="Password" value="${ResponseViewer.escapeHtml(currentAuth.password || '')}" spellcheck="false">
                    </div>
                    <p style="font-size:11px;color:var(--text-tertiary);margin-top:var(--space-sm)">
                        Sent as: <code style="color:var(--accent-secondary)">Authorization: Basic base64(username:password)</code>
                    </p>
                `;
                break;

            case 'apikey':
                container.innerHTML = `
                    <div class="auth-field">
                        <label>Key Name</label>
                        <input type="text" id="authApiKeyName" placeholder="e.g., X-API-Key" value="${ResponseViewer.escapeHtml(currentAuth.keyName || 'X-API-Key')}" spellcheck="false">
                    </div>
                    <div class="auth-field">
                        <label>Key Value</label>
                        <input type="text" id="authApiKeyValue" placeholder="Enter API key" value="${ResponseViewer.escapeHtml(currentAuth.keyValue || '')}" spellcheck="false">
                    </div>
                    <div class="auth-field">
                        <label>Add To</label>
                        <select id="authApiKeyLocation">
                            <option value="header" ${currentAuth.keyLocation !== 'query' ? 'selected' : ''}>Header</option>
                            <option value="query" ${currentAuth.keyLocation === 'query' ? 'selected' : ''}>Query Parameter</option>
                        </select>
                    </div>
                `;
                break;
        }
    }

    /**
     * Get auth headers to add to the request
     */
    function getAuthHeaders() {
        const headers = {};
        const auth = collectCurrentAuth();

        switch (auth.type) {
            case 'bearer':
                if (auth.token) {
                    headers['Authorization'] = `Bearer ${auth.token}`;
                }
                break;

            case 'basic':
                if (auth.username) {
                    const encoded = btoa(`${auth.username}:${auth.password || ''}`);
                    headers['Authorization'] = `Basic ${encoded}`;
                }
                break;

            case 'apikey':
                if (auth.keyName && auth.keyValue && auth.keyLocation !== 'query') {
                    headers[auth.keyName] = auth.keyValue;
                }
                break;
        }

        return headers;
    }

    /**
     * Get auth query params (for API key in query)
     */
    function getAuthQueryParams() {
        const auth = collectCurrentAuth();
        if (auth.type === 'apikey' && auth.keyLocation === 'query' && auth.keyName && auth.keyValue) {
            return { [auth.keyName]: auth.keyValue };
        }
        return {};
    }

    /**
     * Collect current auth configuration from form fields
     */
    function collectCurrentAuth() {
        const type = document.getElementById('authType').value;
        const auth = { type };

        switch (type) {
            case 'bearer': {
                const tokenInput = document.getElementById('authBearerToken');
                auth.token = tokenInput ? tokenInput.value : '';
                break;
            }
            case 'basic': {
                const userInput = document.getElementById('authBasicUser');
                const passInput = document.getElementById('authBasicPass');
                auth.username = userInput ? userInput.value : '';
                auth.password = passInput ? passInput.value : '';
                break;
            }
            case 'apikey': {
                const nameInput = document.getElementById('authApiKeyName');
                const valueInput = document.getElementById('authApiKeyValue');
                const locationInput = document.getElementById('authApiKeyLocation');
                auth.keyName = nameInput ? nameInput.value : 'X-API-Key';
                auth.keyValue = valueInput ? valueInput.value : '';
                auth.keyLocation = locationInput ? locationInput.value : 'header';
                break;
            }
        }

        currentAuth = auth;
        return auth;
    }

    /**
     * Load auth from a saved request
     */
    function loadAuth(authData) {
        if (!authData) {
            currentAuth = { type: 'none' };
        } else {
            currentAuth = { ...authData };
        }
        document.getElementById('authType').value = currentAuth.type;
        renderFields(currentAuth.type);
    }

    /**
     * Get current auth for saving
     */
    function getCurrentAuth() {
        return collectCurrentAuth();
    }

    return { setAuthType, renderFields, getAuthHeaders, getAuthQueryParams, loadAuth, getCurrentAuth, collectCurrentAuth };
})();
