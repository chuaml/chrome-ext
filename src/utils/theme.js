import { storage } from './storage.js';

/**
 * Apply the theme preference to the document body
 */
export async function applyTheme() {
    const theme = await storage.getThemePreference();
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Listen for storage changes to sync theme across extension pages
 */
export function watchThemeChanges() {
    // Sync across extension pages
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[storage.KEYS.THEME_PREFERENCE]) {
            applyTheme();
        }
    });

    // React to system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        storage.getThemePreference().then(theme => {
            if (theme === 'system') applyTheme();
        });
    });
}
