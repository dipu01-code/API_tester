# ReqBench — API Testing Tool Walkthrough

## What Was Built

A full-featured API testing workbench (Postman-lite) built entirely with **vanilla HTML, CSS, and JavaScript** — no frameworks, no build step.

### Project Structure
```
API TESTER/
├── index.html          → Complete app shell (536 lines)
├── css/style.css       → Premium dark theme design system (1,485 lines)
└── js/
    ├── app.js          → Main controller, events, tabs, keyboard shortcuts
    ├── request.js      → fetch() wrapper with timing & error handling
    ├── response.js     → JSON pretty-print, Prism.js syntax highlighting
    ├── headers.js      → Dynamic key-value header/param rows
    ├── collections.js  → localStorage collections with folder tree
    ├── environments.js → {{variable}} replacement system
    ├── auth.js         → Bearer, Basic Auth, API Key helpers
    ├── history.js      → Chronological request log
    ├── chaining.js     → Dot-notation response value extraction
    ├── codegen.js      → cURL, fetch, axios, Python code generation
    └── importexport.js → JSON export, Postman collection import
```

**Total: ~4,760 lines across 12 files**

---

## Features Implemented (Steps 1-13)

| Step | Feature | Details |
|------|---------|---------|
| 1 | GET requests | `fetch()` with URL input and response display |
| 2 | Response details | Status code/text, headers table, timing, size |
| 3 | HTTP methods | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| 4 | Custom headers | Dynamic key-value rows with enable/disable toggle |
| 5 | Pretty-print | JSON formatting, Prism.js syntax highlighting, Pretty/Raw/Headers tabs |
| 6 | Collections | Save/load requests, folder tree sidebar, rename/delete |
| 7 | Environments | `{{variable}}` syntax, environment switcher dropdown, editor modal |
| 8 | Auth helpers | Bearer Token, Basic Auth, API Key (header or query) |
| 9 | History | Auto-logged with timestamp, re-run from sidebar |
| 10 | Request chaining | Dot-notation extraction (e.g., `data.token`), stored as variables |
| 11 | Code generation | cURL, JavaScript fetch, axios, Python requests — modal with copy |
| 12 | Import/export | JSON export, Postman v2.1 import, drag-and-drop file upload |
| 13 | UI polish | Split-pane resize, tabbed multi-request, Ctrl+Enter/S/N shortcuts |

---

## Design Highlights

- **Dark theme** with deep navy/charcoal palette and purple-blue gradients
- **Color-coded method badges**: GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=purple
- **Glassmorphism** modals with backdrop blur
- **Micro-animations**: fade-in rows, toast notifications, loading spinner
- **Inter + JetBrains Mono** typography
- **Resizable** sidebar and split-pane
- **Responsive** layout (adapts to smaller screens)

---

## Verification

- ✅ All 11 JavaScript files pass `node -c` syntax validation
- ✅ Local server running on `http://localhost:3500`
- ✅ No build step required — open [index.html](file:///Users/dipu/Documents/API%20TESTER/index.html) directly or via any HTTP server

## How to Use

1. Open `http://localhost:3500` in your browser (server is running)
2. Enter a URL like `https://jsonplaceholder.typicode.com/posts/1`
3. Click **Send** (or press `Ctrl+Enter`)
4. View the formatted JSON response with syntax highlighting
5. Save requests to collections, switch environments, generate code snippets

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send request |
| `Ctrl+S` | Save request |
| `Ctrl+N` | New tab |
| `Escape` | Close modals |
