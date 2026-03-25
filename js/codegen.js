/* ===================================================
   codegen.js — Code Generation
   Generate curl, fetch, axios, Python requests code
   =================================================== */

const CodeGen = (() => {
    let currentLang = 'curl';

    /**
     * Generate code for the given request config
     */
    function generate(config, lang) {
        currentLang = lang || currentLang;

        switch (currentLang) {
            case 'curl': return generateCurl(config);
            case 'fetch': return generateFetch(config);
            case 'axios': return generateAxios(config);
            case 'python': return generatePython(config);
            default: return '';
        }
    }

    /**
     * Get Prism language for highlighting
     */
    function getPrismLang(lang) {
        switch (lang) {
            case 'curl': return 'bash';
            case 'fetch':
            case 'axios': return 'javascript';
            case 'python': return 'python';
            default: return 'bash';
        }
    }

    function generateCurl(config) {
        const parts = ['curl'];

        if (config.method !== 'GET') {
            parts.push(`-X ${config.method}`);
        }

        parts.push(`'${config.url}'`);

        // Headers
        const allHeaders = { ...config.headers };
        if (allHeaders) {
            Object.entries(allHeaders).forEach(([key, value]) => {
                parts.push(`-H '${key}: ${value}'`);
            });
        }

        // Body
        if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            parts.push(`-d '${config.body.replace(/'/g, "\\'")}'`);
        }

        return parts.join(' \\\n  ');
    }

    function generateFetch(config) {
        let code = '';
        const options = {};

        if (config.method !== 'GET') {
            options.method = `'${config.method}'`;
        }

        const headers = config.headers || {};
        const headerEntries = Object.entries(headers);
        if (headerEntries.length > 0) {
            const headerStr = headerEntries
                .map(([k, v]) => `    '${k}': '${v}'`)
                .join(',\n');
            options.headers = `{\n${headerStr}\n  }`;
        }

        if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            if (config.bodyType === 'json') {
                options.body = `JSON.stringify(${config.body})`;
            } else {
                options.body = `'${config.body.replace(/'/g, "\\'")}'`;
            }
        }

        const optionEntries = Object.entries(options);
        if (optionEntries.length === 0) {
            code = `fetch('${config.url}')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
        } else {
            const optStr = optionEntries
                .map(([k, v]) => `  ${k}: ${v}`)
                .join(',\n');
            code = `fetch('${config.url}', {
${optStr}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
        }

        return code;
    }

    function generateAxios(config) {
        const axiosConfig = [`  url: '${config.url}'`];
        axiosConfig.push(`  method: '${config.method.toLowerCase()}'`);

        const headers = config.headers || {};
        const headerEntries = Object.entries(headers);
        if (headerEntries.length > 0) {
            const headerStr = headerEntries
                .map(([k, v]) => `    '${k}': '${v}'`)
                .join(',\n');
            axiosConfig.push(`  headers: {\n${headerStr}\n  }`);
        }

        if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
            if (config.bodyType === 'json') {
                axiosConfig.push(`  data: ${config.body}`);
            } else {
                axiosConfig.push(`  data: '${config.body.replace(/'/g, "\\'")}'`);
            }
        }

        return `axios({
${axiosConfig.join(',\n')}
})
  .then(response => console.log(response.data))
  .catch(error => console.error('Error:', error));`;
    }

    function generatePython(config) {
        const lines = ['import requests', ''];

        const method = config.method.toLowerCase();
        const headers = config.headers || {};
        const headerEntries = Object.entries(headers);

        if (headerEntries.length > 0) {
            const headerStr = headerEntries
                .map(([k, v]) => `    '${k}': '${v}'`)
                .join(',\n');
            lines.push(`headers = {\n${headerStr}\n}`);
            lines.push('');
        }

        let fnCall = `response = requests.${method}('${config.url}'`;

        if (headerEntries.length > 0) {
            fnCall += ', headers=headers';
        }

        if (config.body && ['post', 'put', 'patch'].includes(method)) {
            if (config.bodyType === 'json') {
                lines.splice(1, 0, 'import json');
                lines.push(`data = ${config.body}`);
                lines.push('');
                fnCall += ', json=data';
            } else {
                fnCall += `, data='${config.body.replace(/'/g, "\\'")}'`;
            }
        }

        fnCall += ')';
        lines.push(fnCall);
        lines.push('');
        lines.push('print(response.status_code)');
        lines.push('print(response.json())');

        return lines.join('\n');
    }

    /**
     * Show the code generation modal
     */
    function showModal(config) {
        const modal = document.getElementById('modalCodeGen');
        modal.classList.remove('hidden');

        updateOutput(config, currentLang);

        // Tab listeners
        modal.querySelectorAll('.codegen__tab').forEach(tab => {
            tab.onclick = () => {
                modal.querySelectorAll('.codegen__tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentLang = tab.dataset.lang;
                updateOutput(config, currentLang);
            };
        });

        // Copy button
        document.getElementById('btnCopyCode').onclick = () => {
            const code = document.getElementById('codegenOutput').textContent;
            navigator.clipboard.writeText(code).then(() => {
                App.showToast('Code copied to clipboard', 'success');
            });
        };
    }

    function updateOutput(config, lang) {
        const code = generate(config, lang);
        const prismLang = getPrismLang(lang);
        const highlighted = Prism.highlight(code, Prism.languages[prismLang], prismLang);
        document.getElementById('codegenOutput').innerHTML = highlighted;
    }

    return { generate, showModal, getPrismLang };
})();
