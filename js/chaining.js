/* ===================================================
   chaining.js — Request Chaining
   Extract values from responses, set variables
   =================================================== */

const Chaining = (() => {
    let variables = {};

    /**
     * Get all chain variables
     */
    function getVariables() {
        return { ...variables };
    }

    /**
     * Set a variable
     */
    function setVariable(name, value) {
        variables[name] = value;
    }

    /**
     * Clear all chain variables
     */
    function clearVariables() {
        variables = {};
    }

    /**
     * Process extraction rules after getting a response
     */
    function processRules(responseBody) {
        const rules = getRules();
        if (rules.length === 0) return;

        let parsed = null;
        try {
            parsed = JSON.parse(responseBody);
        } catch (e) {
            return; // Can't extract from non-JSON
        }

        rules.forEach(rule => {
            if (!rule.path || !rule.variable) return;
            try {
                const value = getNestedValue(parsed, rule.path);
                if (value !== undefined) {
                    variables[rule.variable] = String(value);
                }
            } catch (e) {
                console.warn(`Chain extraction failed for ${rule.path}:`, e);
            }
        });
    }

    /**
     * Get value from object using dot notation path
     */
    function getNestedValue(obj, path) {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            // Handle array index notation like items[0]
            const match = part.match(/^(\w+)\[(\d+)\]$/);
            if (match) {
                current = current[match[1]];
                if (Array.isArray(current)) {
                    current = current[parseInt(match[2])];
                } else {
                    return undefined;
                }
            } else {
                current = current[part];
            }
        }
        return current;
    }

    /**
     * Get extraction rules from the UI
     */
    function getRules() {
        const rules = [];
        document.querySelectorAll('#chainRules .chain-rule').forEach(row => {
            const path = row.querySelector('.chain-path').value.trim();
            const variable = row.querySelector('.chain-variable').value.trim();
            if (path || variable) {
                rules.push({ path, variable });
            }
        });
        return rules;
    }

    /**
     * Add a chain rule row to the UI
     */
    function addRule(path = '', variable = '') {
        const container = document.getElementById('chainRules');

        // Remove empty state if present
        const emptyState = container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        const row = document.createElement('div');
        row.className = 'chain-rule';
        row.innerHTML = `
            <input type="text" class="chain-path" placeholder="response.data.token" value="${ResponseViewer.escapeHtml(path)}" spellcheck="false">
            <input type="text" class="chain-variable" placeholder="Variable name" value="${ResponseViewer.escapeHtml(variable)}" spellcheck="false">
            <button class="kv-row__delete" title="Remove">&times;</button>
        `;
        row.querySelector('.kv-row__delete').addEventListener('click', () => {
            row.remove();
            const remaining = container.querySelectorAll('.chain-rule');
            if (remaining.length === 0) {
                container.innerHTML = '<div class="empty-state empty-state--sm"><p>No extraction rules defined</p></div>';
            }
        });
        container.appendChild(row);
    }

    /**
     * Load rules from saved data
     */
    function loadRules(rulesArray) {
        const container = document.getElementById('chainRules');
        container.innerHTML = '';

        if (!rulesArray || rulesArray.length === 0) {
            container.innerHTML = '<div class="empty-state empty-state--sm"><p>No extraction rules defined</p></div>';
            return;
        }

        rulesArray.forEach(rule => addRule(rule.path, rule.variable));
    }

    return { getVariables, setVariable, clearVariables, processRules, getRules, addRule, loadRules };
})();
