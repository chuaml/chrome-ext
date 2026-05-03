# Project Improvement Roadmap

This document outlines identified areas for improvement and a phased plan to enhance the extension's architecture, user experience, and robustness.

## 1. Identified Areas for Improvement

### A. State Management & Synchronization
- **Issue**: Current synchronization between the side panel, popup, and background script relies on polling or manual message passing for some states.
- **Goal**: Implement a robust, event-driven state synchronization using `chrome.storage.onChanged` more consistently and potentially a centralized state manager.

### B. Modular CSS Injection
- **Issue**: CSS is currently injected as raw strings. Large amounts of CSS might become hard to manage.
- **Goal**: Support "CSS Collections" or "Snippets" that can be toggled independently for a single domain.

### C. UI/UX Refinements
- **Issue**: The current dark mode is system-wide only.
- **Goal**: Add a manual theme toggle (Light/Dark/System) in the Advanced Settings.
- **Goal**: Implement a "Live Preview" mode where CSS changes are applied as the user types (with a slight debounce).

### D. Security Hardening
- **Issue**: `host_permissions` are set to `<all_urls>`. While necessary for a general injector, we could implement a "request permission on click" flow for better privacy.
- **Goal**: Audit content scripts to ensure they use the most restrictive "world" possible.

### E. Developer Experience (DX)
- **Issue**: Testing coverage for UI components is currently minimal.
- **Goal**: Add Vitest suites for the Options page logic and Side Panel UI interactions.

---

## 2. Implementation Plan

### Phase 1: Architectural Foundation (Next Steps)
1.  **Centralized Storage Helper**: Create `src/utils/storage.js` to wrap `chrome.storage.local` with type-safe getters/setters and standardized keys.
2.  **Manual Theme Override**: Update `options.html` and `sidepanel.html` to allow users to force a theme regardless of system settings.

### Phase 2: Enhanced Injection Logic
1.  **Debounced Live Preview**: Implement a listener in `sidepanel.js` that injects CSS temporarily while editing.
2.  **Snippet Management**: Refactor storage schema to support multiple CSS blobs per domain.

### Phase 3: UX & Performance
1.  **Performance Audit**: Ensure that broad CSS injection (Global scope) doesn't cause layout shift (CLS) on heavy sites.
2.  **Search & Tags**: Add tagging to saved scopes for easier organization in Advanced Settings.

### Phase 4: Quality Assurance
1.  **Unit Tests**: Implement tests for storage migration and configuration import/export logic.
2.  **CI/CD**: Add a GitHub Action to run `npm run build` and `npm test` on every PR.
