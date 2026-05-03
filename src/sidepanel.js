'use strict';

import { storage } from './utils/storage.js';
import { applyTheme, watchThemeChanges } from './utils/theme.js';

const cssInput = document.getElementById('css-input');
const injectBtn = document.getElementById('inject-btn');
const statusDiv = document.getElementById('status');
const domainDisplay = document.getElementById('domain-display');
const scopeDomain = document.getElementById('scope-domain');
const scopeGlobal = document.getElementById('scope-global');
const masterToggle = document.getElementById('master-toggle');
const toggleGtag = document.getElementById('toggle-gtag');
const toggleReferrer = document.getElementById('toggle-referrer');
const savedScopesList = document.getElementById('saved-scopes-list');
const openSettingsBtn = document.getElementById('open-settings');
const themeSelect = document.getElementById('theme-select');

let currentTabDomain = '';
let isUpdatingFromStorage = false;

const DEFAULT_GLOBAL_CSS = `/* Global Styles */
html {
    /* Example: Dark mode filter */
    /* filter: invert(.9) hue-rotate(180deg); */
}`;

function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    setTimeout(() => {
        if (statusDiv.textContent === message) {
            statusDiv.textContent = '';
            statusDiv.className = 'status';
        }
    }, 3000);
}

async function updateSavedScopesList() {
    const allStorage = await storage.getAll();
    savedScopesList.innerHTML = '';
    
    const savedKeys = Object.keys(allStorage);
    const savedDomains = new Set();

    savedKeys.forEach(key => {
        if (key.startsWith(storage.KEYS.CSS_PREFIX) || 
            key.startsWith(storage.KEYS.GTAG_PREFIX) || 
            key.startsWith(storage.KEYS.REFERRER_PREFIX)) {
            const domain = key.split('_').slice(1).join('_');
            if (domain && domain !== 'global') savedDomains.add(domain);
        }
    });

    const sortedDomains = ['global', ...Array.from(savedDomains).sort()];

    sortedDomains.forEach(domain => {
        const li = document.createElement('li');
        li.className = 'saved-scope-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'saved-scope-name';
        nameSpan.textContent = domain === 'global' ? '🌐 Global Session' : domain;
        nameSpan.onclick = () => loadSavedScope(domain);
        
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-scope';
        deleteBtn.textContent = '×';
        if (domain === 'global') deleteBtn.style.visibility = 'hidden';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSavedScope(domain);
        };
        
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        savedScopesList.appendChild(li);
    });
}

async function loadSavedScope(domain) {
    const session = await storage.getUiSession();
    session.mode = 'viewing_saved';
    session.target = domain;
    session.scope = (domain === 'global') ? 'global' : 'domain';
    await storage.setUiSession(session);
    updateUI();
}

async function deleteSavedScope(domain) {
    if (confirm(`Delete settings for ${domain}?`)) {
        await storage.remove([
            `${storage.KEYS.CSS_PREFIX}${domain}`, 
            `${storage.KEYS.GTAG_PREFIX}${domain}`, 
            `${storage.KEYS.REFERRER_PREFIX}${domain}`
        ]);
        const session = await storage.getUiSession();
        if (session.target === domain) {
            session.mode = 'active_tab';
            session.target = '';
            await storage.setUiSession(session);
        }
        updateUI();
    }
}

async function updateUI() {
    if (isUpdatingFromStorage) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.startsWith('http')) {
        try {
            currentTabDomain = new URL(tab.url).hostname;
        } catch (e) {
            currentTabDomain = '';
        }
    } else {
        currentTabDomain = '';
    }

    const session = await storage.getUiSession();
    
    let effectiveTarget = '';
    if (session.mode === 'active_tab') {
        effectiveTarget = (session.scope === 'global') ? 'global' : currentTabDomain;
    } else {
        effectiveTarget = session.target;
    }

    scopeGlobal.checked = (session.scope === 'global');
    scopeDomain.checked = (session.scope === 'domain');

    if (session.scope === 'global') {
        domainDisplay.textContent = 'Scope: Global Session';
    } else if (session.mode === 'active_tab') {
        domainDisplay.textContent = currentTabDomain ? `Active Domain: ${currentTabDomain}` : 'Navigate to a website';
    } else {
        domainDisplay.textContent = `Viewing Saved: ${session.target}`;
    }

    const lookupTarget = effectiveTarget || 'global';
    const settings = await storage.getDomainSettings(lookupTarget);

    cssInput.value = settings.css || (lookupTarget === 'global' ? DEFAULT_GLOBAL_CSS : '');
    toggleGtag.checked = settings.gtag;
    toggleReferrer.checked = settings.referrer;

    const enabled = await storage.isInjectorEnabled();
    masterToggle.checked = enabled;
    [cssInput, injectBtn, scopeDomain, scopeGlobal, toggleGtag, toggleReferrer].forEach(el => el.disabled = !enabled);
    
    const theme = await storage.getThemePreference();
    themeSelect.value = theme;

    updateSavedScopesList();
}

// Initial load
(async () => {
    await applyTheme();
    watchThemeChanges();
    updateUI();
})();

// Sync changes from other pages
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const importantKeys = [
        storage.KEYS.UI_SESSION, 
        storage.KEYS.INJECTOR_ENABLED, 
        storage.KEYS.THEME_PREFERENCE
    ];

    if (Object.keys(changes).some(k => importantKeys.includes(k))) {
        isUpdatingFromStorage = true;
        updateUI().then(() => isUpdatingFromStorage = false);
    }
    
    storage.getUiSession().then(session => {
        const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
        const relevantKeys = [
            `${storage.KEYS.CSS_PREFIX}${lookupTarget}`, 
            `${storage.KEYS.GTAG_PREFIX}${lookupTarget}`, 
            `${storage.KEYS.REFERRER_PREFIX}${lookupTarget}`
        ];
        if (Object.keys(changes).some(k => relevantKeys.includes(k))) {
            updateUI();
        }
        updateSavedScopesList();
    });
});

// Event Listeners
chrome.tabs.onActivated.addListener(updateUI);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') updateUI();
});

scopeDomain.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    session.scope = 'domain';
    session.mode = 'active_tab';
    await storage.setUiSession(session);
    updateUI();
});

scopeGlobal.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    session.scope = 'global';
    session.mode = 'active_tab';
    await storage.setUiSession(session);
    updateUI();
});

masterToggle.addEventListener('change', async () => {
    await storage.setInjectorEnabled(masterToggle.checked);
});

themeSelect.addEventListener('change', async () => {
    await storage.setThemePreference(themeSelect.value);
});

openSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
});

injectBtn.addEventListener('click', async () => {
    const enabled = await storage.isInjectorEnabled();
    if (!enabled) return;

    const session = await storage.getUiSession();
    const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');

    if (!lookupTarget) {
        showStatus('No target to save settings for.', 'error');
        return;
    }

    await storage.setDomainSettings(lookupTarget, {
        css: cssInput.value,
        gtag: toggleGtag.checked,
        referrer: toggleReferrer.checked
    });

    showStatus('Settings Saved & Applied!');

    chrome.runtime.sendMessage({ 
        action: 'insertCss', 
        scope: session.scope,
        domain: lookupTarget 
    });
});
