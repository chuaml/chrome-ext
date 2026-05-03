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

let currentDomain = '';

const DEFAULT_GLOBAL_CSS = `html {
    filter: invert(.9) hue-rotate(180deg) saturate(1.5) brightness(1.1);
    background-color: #ddd;
}

img[src],
video[src],
[class*="img"],
[class*="image"] {
    filter: invert(1) hue-rotate(180deg);
}`;

async function getActiveScope() {
    return scopeDomain.checked ? 'domain' : 'global';
}

async function updateUI() {
    const scope = await getActiveScope();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url && tab.url.startsWith('http')) {
        try {
            const url = new URL(tab.url);
            currentDomain = url.hostname;
        } catch (e) {
            currentDomain = '';
        }
    } else {
        currentDomain = '';
    }

    if (scope === 'domain') {
        domainDisplay.textContent = currentDomain ? `Customizing: ${currentDomain}` : 'Navigate to a website';
        if (currentDomain) {
            const storageKey = `css_${currentDomain}`;
            const result = await chrome.storage.local.get([storageKey]);
            cssInput.value = result[storageKey] || '';
        } else {
            cssInput.value = '';
        }
    } else {
        domainDisplay.textContent = 'Customizing: Global Session';
        const result = await chrome.storage.local.get(['css_global']);
        cssInput.value = result.css_global !== undefined ? result.css_global : DEFAULT_GLOBAL_CSS;
    }

    // Disable UI if master toggle is off
    const enabled = masterToggle.checked;
    cssInput.disabled = !enabled;
    injectBtn.disabled = !enabled;
    scopeDomain.disabled = !enabled;
    scopeGlobal.disabled = !enabled;
    
    statusDiv.textContent = enabled ? '' : 'Injector is disabled globally.';
}

// Initial load
chrome.storage.local.get(['injector_enabled', 'last_scope', 'gtag_enabled', 'referrer_enabled'], (res) => {
    if (res.injector_enabled !== undefined) {
        masterToggle.checked = res.injector_enabled;
    }
    if (res.gtag_enabled !== undefined) {
        toggleGtag.checked = res.gtag_enabled;
    }
    if (res.referrer_enabled !== undefined) {
        toggleReferrer.checked = res.referrer_enabled;
    }
    if (res.last_scope === 'global') {
        scopeGlobal.checked = true;
    }
    updateUI();
});

// Listeners for UI updates
chrome.tabs.onActivated.addListener(updateUI);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') updateUI();
});
scopeDomain.addEventListener('change', updateUI);
scopeGlobal.addEventListener('change', updateUI);

masterToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ injector_enabled: masterToggle.checked });
    updateUI();
});

toggleGtag.addEventListener('change', async () => {
    await chrome.storage.local.set({ gtag_enabled: toggleGtag.checked });
});

toggleReferrer.addEventListener('change', async () => {
    await chrome.storage.local.set({ referrer_enabled: toggleReferrer.checked });
});

injectBtn.addEventListener('click', async () => {
    if (!masterToggle.checked) return;

    const scope = await getActiveScope();
    const cssCode = cssInput.value;
    
    let storageKey;
    if (scope === 'domain') {
        if (!currentDomain) {
            statusDiv.textContent = 'No domain to inject into.';
            return;
        }
        storageKey = `css_${currentDomain}`;
    } else {
        storageKey = 'css_global';
    }

    // Save CSS
    await chrome.storage.local.set({ [storageKey]: cssCode });
    await chrome.storage.local.set({ last_scope: scope }); // Remember scope
    
    statusDiv.textContent = 'Injecting...';

    // Send message to background script
    chrome.runtime.sendMessage({ 
        action: 'insertCss', 
        scope: scope,
        domain: currentDomain 
    }, (response) => {
        if (chrome.runtime.lastError) {
            statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else if (response && response.success) {
            statusDiv.textContent = `CSS (${scope}) Injected successfully!`;
            setTimeout(() => {
                if (statusDiv.textContent.includes('Injected successfully')) {
                    statusDiv.textContent = '';
                }
            }, 3000);
        } else {
            statusDiv.textContent = 'Injection failed: ' + (response?.error || 'Unknown error');
        }
    });
});
