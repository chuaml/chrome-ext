/**
 * Centralized Storage Utility for the CSS Injector Extension
 */

const STORAGE_KEYS = {
    UI_SESSION: 'ui_session',
    INJECTOR_ENABLED: 'injector_enabled',
    THEME_PREFERENCE: 'theme_preference', // 'system' | 'light' | 'dark'
    SNIPPETS_PREFIX: 'snippets_', // Array of { id, name, code, enabled }
    TAGS_PREFIX: 'tags_', // Array of strings
    GTAG_PREFIX: 'gtag_',
    REFERRER_PREFIX: 'referrer_'
};

export const storage = {
    KEYS: STORAGE_KEYS,

    /**
     * Get all local storage data
     */
    async getAll() {
        return await chrome.storage.local.get(null);
    },

    /**
     * Set multiple items in local storage
     */
    async set(data) {
        return await chrome.storage.local.set(data);
    },

    /**
     * Remove one or more keys from local storage
     */
    async remove(keys) {
        return await chrome.storage.local.remove(keys);
    },

    /**
     * Clear all local storage
     */
    async clear() {
        return await chrome.storage.local.clear();
    },

    // --- Specialized Getters/Setters ---

    async getUiSession() {
        const res = await chrome.storage.local.get([STORAGE_KEYS.UI_SESSION]);
        return res[STORAGE_KEYS.UI_SESSION] || {
            scope: 'domain',
            mode: 'active_tab',
            target: '',
            activeSnippetId: null
        };
    },

    async setUiSession(session) {
        await this.set({ [STORAGE_KEYS.UI_SESSION]: session });
    },

    async isInjectorEnabled() {
        const res = await chrome.storage.local.get([STORAGE_KEYS.INJECTOR_ENABLED]);
        return res[STORAGE_KEYS.INJECTOR_ENABLED] !== false;
    },

    async setInjectorEnabled(enabled) {
        await this.set({ [STORAGE_KEYS.INJECTOR_ENABLED]: enabled });
    },

    async getThemePreference() {
        const res = await chrome.storage.local.get([STORAGE_KEYS.THEME_PREFERENCE]);
        return res[STORAGE_KEYS.THEME_PREFERENCE] || 'system';
    },

    async setThemePreference(theme) {
        await this.set({ [STORAGE_KEYS.THEME_PREFERENCE]: theme });
    },

    /**
     * Get tags for a domain
     */
    async getDomainTags(domain) {
        const key = `${STORAGE_KEYS.TAGS_PREFIX}${domain}`;
        const res = await chrome.storage.local.get([key]);
        return res[key] || [];
    },

    async setDomainTags(domain, tags) {
        await this.set({ [`${STORAGE_KEYS.TAGS_PREFIX}${domain}`]: tags });
    },

    /**
     * Get domain-specific settings including snippets and tags
     */
    async getDomainSettings(domain) {
        const keys = [
            `${STORAGE_KEYS.SNIPPETS_PREFIX}${domain}`,
            `${STORAGE_KEYS.TAGS_PREFIX}${domain}`,
            `${STORAGE_KEYS.GTAG_PREFIX}${domain}`,
            `${STORAGE_KEYS.REFERRER_PREFIX}${domain}`,
            `css_${domain}` // For migration
        ];
        const res = await chrome.storage.local.get(keys);
        
        let snippets = res[`${STORAGE_KEYS.SNIPPETS_PREFIX}${domain}`] || [];
        const tags = res[`${STORAGE_KEYS.TAGS_PREFIX}${domain}`] || [];
        
        // Simple Migration: If old css_domain exists, convert to first snippet
        const oldCss = res[`css_${domain}`];
        if (oldCss && snippets.length === 0) {
            snippets = [{
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
                name: 'Default Snippet',
                code: oldCss,
                enabled: true
            }];
            await this.setDomainSnippets(domain, snippets);
            await this.remove(`css_${domain}`);
        }

        return {
            snippets: snippets,
            tags: tags,
            gtag: !!res[`${STORAGE_KEYS.GTAG_PREFIX}${domain}`],
            referrer: !!res[`${STORAGE_KEYS.REFERRER_PREFIX}${domain}`]
        };
    },

    async setDomainSnippets(domain, snippets) {
        await this.set({ [`${STORAGE_KEYS.SNIPPETS_PREFIX}${domain}`]: snippets });
    },

    async setDomainSettings(domain, { gtag, referrer }) {
        const data = {};
        if (gtag !== undefined) data[`${STORAGE_KEYS.GTAG_PREFIX}${domain}`] = gtag;
        if (referrer !== undefined) data[`${STORAGE_KEYS.REFERRER_PREFIX}${domain}`] = referrer;
        await this.set(data);
    },

    /**
     * Export entire configuration as a JSON-serializable object
     */
    async exportConfig() {
        return await this.getAll();
    },

    /**
     * Import configuration from a JSON-serializable object
     * @param {Object} config 
     */
    async importConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration format');
        }
        await this.clear();
        await this.set(config);
    }
};
