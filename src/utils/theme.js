import { storage } from './storage.js';

/**
 * Apply the theme preference to the document body
 */
export async function applyTheme() {
    const theme = await storage.getThemePreference();
    const body = document.body;
    
    if (theme === 'system') {
        body.removeAttribute('data-theme');
    } else {
        body.setAttribute('data-theme', theme);
    }
}

/**
 * Listen for storage changes to sync theme across extension pages
 */
export function watchThemeChanges() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[storage.KEYS.THEME_PREFERENCE]) {
            applyTheme();
        }
    });
}
