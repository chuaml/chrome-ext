'use strict';

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

async function getSession() {
    const res = await chrome.storage.local.get(['ui_session']);
    return res.ui_session || {
        scope: 'domain',
        mode: 'active_tab',
        target: ''
    };
}

async function saveSession(session) {
    if (isUpdatingFromStorage) return;
    await chrome.storage.local.set({ ui_session: session });
}

async function updateSavedScopesList() {
    const allStorage = await chrome.storage.local.get(null);
    savedScopesList.innerHTML = '';
    
    const savedKeys = Object.keys(allStorage);
    const savedDomains = new Set();

    savedKeys.forEach(key => {
        if (key.startsWith('css_') || key.startsWith('gtag_') || key.startsWith('referrer_')) {
            const domain = key.split('_').slice(1).join('_');
            if (domain && domain !== 'global') savedDomains.add(domain);
        }
    });

    // Always show Global in saved scopes if not already there
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
    const session = await getSession();
    session.mode = 'viewing_saved';
    session.target = domain;
    session.scope = (domain === 'global') ? 'global' : 'domain';
    await saveSession(session);
    updateUI();
}

async function deleteSavedScope(domain) {
    if (confirm(`Delete settings for ${domain}?`)) {
        await chrome.storage.local.remove([`css_${domain}`, `gtag_${domain}`, `referrer_${domain}`]);
        const session = await getSession();
        if (session.target === domain) {
            session.mode = 'active_tab';
            session.target = '';
            await saveSession(session);
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

    const session = await getSession();
    
    // Determine effective target
    let effectiveTarget = '';
    if (session.mode === 'active_tab') {
        effectiveTarget = (session.scope === 'global') ? 'global' : currentTabDomain;
    } else {
        effectiveTarget = session.target;
    }

    // Sync radio buttons
    scopeGlobal.checked = (session.scope === 'global');
    scopeDomain.checked = (session.scope === 'domain');

    // Update display
    if (session.scope === 'global') {
        domainDisplay.textContent = 'Scope: Global Session';
    } else if (session.mode === 'active_tab') {
        domainDisplay.textContent = currentTabDomain ? `Active Domain: ${currentTabDomain}` : 'Navigate to a website';
    } else {
        domainDisplay.textContent = `Viewing Saved: ${session.target}`;
    }

    // Load data from storage for the effective target
    const lookupTarget = effectiveTarget || 'global';
    const storageKeys = [`css_${lookupTarget}`, `gtag_${lookupTarget}`, `referrer_${lookupTarget}`];
    const result = await chrome.storage.local.get(storageKeys);

    // Only update textarea if it's not currently focused to avoid jumpy behavior
    // (Though for total sync we might want to update it anyway)
    cssInput.value = result[`css_${lookupTarget}`] || (lookupTarget === 'global' ? DEFAULT_GLOBAL_CSS : '');
    toggleGtag.checked = !!result[`gtag_${lookupTarget}`];
    toggleReferrer.checked = !!result[`referrer_${lookupTarget}`];

    // Disable UI if master toggle is off
    const enabled = masterToggle.checked;
    [cssInput, injectBtn, scopeDomain, scopeGlobal, toggleGtag, toggleReferrer].forEach(el => el.disabled = !enabled);
    
    updateSavedScopesList();
}

// Initial load
chrome.storage.local.get(['injector_enabled'], (res) => {
    if (res.injector_enabled !== undefined) {
        masterToggle.checked = res.injector_enabled;
    }
    updateUI();
});

// Sync across sidepanel instances
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.ui_session || changes.injector_enabled) {
        if (changes.injector_enabled) {
            masterToggle.checked = changes.injector_enabled.newValue;
        }
        isUpdatingFromStorage = true;
        updateUI().then(() => isUpdatingFromStorage = false);
    }
    
    // If CSS or privacy settings for the CURRENTLY DISPLAYED target changed elsewhere
    getSession().then(session => {
        const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
        const relevantKeys = [`css_${lookupTarget}`, `gtag_${lookupTarget}`, `referrer_${lookupTarget}`];
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
    const session = await getSession();
    session.scope = 'domain';
    session.mode = 'active_tab'; // Reset to active tab when clicking domain radio
    await saveSession(session);
    updateUI();
});

scopeGlobal.addEventListener('change', async () => {
    const session = await getSession();
    session.scope = 'global';
    session.mode = 'active_tab';
    await saveSession(session);
    updateUI();
});

masterToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ injector_enabled: masterToggle.checked });
});

injectBtn.addEventListener('click', async () => {
    if (!masterToggle.checked) return;

    const session = await getSession();
    const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');

    if (!lookupTarget) {
        showStatus('No target to save settings for.', 'error');
        return;
    }

    const settings = {
        [`css_${lookupTarget}`]: cssInput.value,
        [`gtag_${lookupTarget}`]: toggleGtag.checked,
        [`referrer_${lookupTarget}`]: toggleReferrer.checked
    };

    await chrome.storage.local.set(settings);
    showStatus('Settings Saved & Applied!');

    // Trigger injection
    chrome.runtime.sendMessage({ 
        action: 'insertCss', 
        scope: session.scope,
        domain: lookupTarget 
    });
});
