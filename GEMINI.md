# Project Instructions: Chrome Extension (Manifest V3)

This project is a custom Chrome Extension built with Vite and the `@crxjs/vite-plugin`. It follows the Manifest V3 standard.

**Gemini CLI** is used in this workspace as an interactive engineering assistant to help with codebase modifications, research, and automation. This file provides the necessary context for the agent to operate effectively.

## Architecture & Tooling
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Plugin:** [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin) - Handles manifest management and extension-specific bundling.
- **Manifest:** Defined dynamically in `manifest.config.js`, which imports static parts from `manifest.json.js`.

## Key Components
- **Background Service Worker:** `src/background/background.js` (Module type).
- **Popup UI:** `popup.menu.html` and `popup.menu.js`.
- **Side Panel:** `sidepanel.html` and `src/sidepanel.js` (Custom CSS Injector UI).
- **Content Scripts:**
    - `src/main.js`: Primary content script.
    - `src/scripting/injectCss.js`: CSS injection logic (Triggers injection on load).
    - `src/darkmode/_.js`: Dark mode implementation (specifically for `idx.dev`).
    - `src/anti-tracker/`: Tracker blocking logic (`gtag-denied.js`, `referrer-policy.js`).
    - `src/scripting/cdp.debugger.js`: Debugger integration.

## Custom CSS Injector
The extension includes a feature to inject custom CSS into the active tab from the side panel.
- **UI:** Located in the side panel (`sidepanel.html`).
- **Mechanism:** Uses `chrome.scripting.insertCSS` via the background script for safe and reliable injection.
- **Persistence:** CSS code is saved to `chrome.storage.local`.

## Permissions
The extension requests the following permissions:
- `storage`: For persisting settings.
- `scripting`: For injecting scripts and CSS.
- `activeTab`: Access to the current tab.
- `debugger`: For Chrome DevTools Protocol (CDP) interactions.
- `tabs`: Querying and manipulating tabs.
- `host_permissions`: `<all_urls>` for broad functionality.

## Development Workflow
- **Start Development Mode:** `npm run dev`
  - This starts Vite in watch mode. The extension will automatically reload in Chrome when changes are detected.
- **Build for Production:** `npm run build`
  - Outputs the bundled extension to the `dist/` directory.
- **Linting:** `npm run lint`
  - Runs ESLint to ensure code quality and adherence to project standards.

## Testing Strategy
- **Framework:** [Vitest](https://vitest.dev/)
- **Environment:** `jsdom` (for DOM-related testing in content scripts/popups).
- **Execution:**
    - `npm test`: Run tests once.
    - `npm run test:watch`: Run tests in watch mode.
- **Conventions:** Place test files in `src/` with `.test.js` or `.spec.js` suffixes.
- **CI/CD:** Automated tests and builds are performed on every PR and push to `main` via GitHub Actions (`.github/workflows/ci.yml`).

## Gemini CLI Usage
- **Context Awareness:** When working on this project, be aware that `@crxjs/vite-plugin` handles the transformation of `manifest.json`. Edits should generally be made to `manifest.json.js` or `manifest.config.js`.
- **CSS Injection:** Note that content scripts should import CSS as modules or use the provided `injectCss.js` utility, as static CSS mapping in `manifest.json` after build is discouraged/restricted by the current config.
- **Surgical Edits:** Use `replace` for targeted changes in `src/`.
- **Verification:** Always verify changes by checking the `dist/` output or running the build if logic changes affect the manifest or complex bundling.
