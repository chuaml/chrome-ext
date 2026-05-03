/**
 * Centralized Storage Utility for the CSS Injector Extension
 */

const STORAGE_KEYS = {
    UI_SESSION: 'ui_session',
    INJECTOR_ENABLED: 'injector_enabled',
    THEME_PREFERENCE: 'theme_preference', // 'system' | 'light' | 'dark'
    CSS_PREFIX: 'css_',
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
            target: ''
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
     * Get domain-specific settings
     */
    async getDomainSettings(domain) {
        const keys = [
            `${STORAGE_KEYS.CSS_PREFIX}${domain}`,
            `${STORAGE_KEYS.GTAG_PREFIX}${domain}`,
            `${STORAGE_KEYS.REFERRER_PREFIX}${domain}`
        ];
        const res = await chrome.storage.local.get(keys);
        return {
            css: res[`${STORAGE_KEYS.CSS_PREFIX}${domain}`] || '',
            gtag: !!res[`${STORAGE_KEYS.GTAG_PREFIX}${domain}`],
            referrer: !!res[`${STORAGE_KEYS.REFERRER_PREFIX}${domain}`]
        };
    },

    async setDomainSettings(domain, { css, gtag, referrer }) {
        const data = {};
        if (css !== undefined) data[`${STORAGE_KEYS.CSS_PREFIX}${domain}`] = css;
        if (gtag !== undefined) data[`${STORAGE_KEYS.GTAG_PREFIX}${domain}`] = gtag;
        if (referrer !== undefined) data[`${STORAGE_KEYS.REFERRER_PREFIX}${domain}`] = referrer;
        await this.set(data);
    }
};
