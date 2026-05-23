'use strict';

import { storage } from './utils/storage.js';
import { applyTheme, watchThemeChanges } from './utils/theme.js';

// DOM Elements
const cssInput = document.getElementById('css-input');
const snippetNameInput = document.getElementById('snippet-name');
const saveSnippetBtn = document.getElementById('save-snippet-btn');
const addSnippetBtn = document.getElementById('add-snippet-btn');
const addDarkmodeBtn = document.getElementById('add-darkmode-btn');
const snippetList = document.getElementById('snippet-list');
const editorContainer = document.getElementById('editor-container');
const noSnippetsMsg = document.getElementById('no-snippets-msg');

const statusDiv = document.getElementById('status');
const domainDisplay = document.getElementById('domain-display');
const tagContainer = document.getElementById('tag-container');
const addTagInput = document.getElementById('add-tag-input');
const addTagBtn = document.getElementById('add-tag-btn');

const scopeDomain = document.getElementById('scope-domain');
const scopeGlobal = document.getElementById('scope-global');
const masterToggle = document.getElementById('master-toggle');
const toggleGtag = document.getElementById('toggle-gtag');
const toggleReferrer = document.getElementById('toggle-referrer');
const savedScopesList = document.getElementById('saved-scopes-list');
const openSettingsBtn = document.getElementById('open-settings');
const themeSelect = document.getElementById('theme-select');

// State
let currentTabDomain = '';
let isUpdatingFromStorage = false;
let previewTimeout = null;

const DEFAULT_GLOBAL_CSS = `/* Global Styles */
html {
    /* Example: Dark mode filter */
    /* filter: invert(.9) hue-rotate(180deg); */
}`;

// --- Utilities ---

function debounce(func, wait) {
    return function (...args) {
        clearTimeout(previewTimeout);
        // eslint-disable-next-line no-invalid-this
        previewTimeout = setTimeout(() => func.apply(this, args), wait);
    };
}

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

// --- UI Rendering ---

async function updateSavedScopesList() {
    const allStorage = await storage.getAll();
    savedScopesList.innerHTML = '';
    
    const savedKeys = Object.keys(allStorage);
    const savedDomains = new Set();

    savedKeys.forEach(key => {
        if (key.startsWith(storage.KEYS.SNIPPETS_PREFIX) || 
            key.startsWith(storage.KEYS.GTAG_PREFIX) || 
            key.startsWith(storage.KEYS.REFERRER_PREFIX) ||
            key.startsWith(storage.KEYS.TAGS_PREFIX)) {
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

function renderTags(tags) {
    tagContainer.innerHTML = '';
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'badge';
        span.style.cursor = 'pointer';
        span.title = 'Click to remove';
        span.textContent = tag + ' ×';
        span.onclick = () => removeTag(tag);
        tagContainer.appendChild(span);
    });
}

async function renderSnippetList(snippets, activeSnippetId) {
    snippetList.innerHTML = '';
    
    if (snippets.length === 0) {
        noSnippetsMsg.style.display = 'block';
        editorContainer.style.display = 'none';
        return;
    }

    noSnippetsMsg.style.display = 'none';
    
    snippets.forEach(snippet => {
        const item = document.createElement('div');
        item.className = `saved-scope-item ${snippet.id === activeSnippetId ? 'active' : ''}`;
        item.style.padding = '8px 12px';
        if (snippet.id === activeSnippetId) {
            item.style.borderColor = 'var(--primary-color)';
            item.style.background = 'var(--badge-bg)';
        }

        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.style.gap = '10px';
        leftSide.style.flex = '1';
        leftSide.style.cursor = 'pointer';
        leftSide.onclick = () => selectSnippet(snippet.id);

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = snippet.enabled;
        toggle.onclick = (e) => {
            e.stopPropagation();
            toggleSnippet(snippet.id, toggle.checked);
        };

        const name = document.createElement('span');
        name.textContent = snippet.name || 'Untitled';
        name.style.fontSize = '0.85rem';
        name.style.fontWeight = snippet.id === activeSnippetId ? '600' : '400';

        leftSide.appendChild(toggle);
        leftSide.appendChild(name);

        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-scope';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteSnippet(snippet.id);
        };

        item.appendChild(leftSide);
        item.appendChild(deleteBtn);
        snippetList.appendChild(item);
    });

    if (activeSnippetId) {
        const activeSnippet = snippets.find(s => s.id === activeSnippetId);
        if (activeSnippet) {
            editorContainer.style.display = 'block';
            snippetNameInput.value = activeSnippet.name;
            cssInput.value = activeSnippet.code;
        } else {
            editorContainer.style.display = 'none';
        }
    } else {
        editorContainer.style.display = 'none';
    }
}

// --- Logic ---

async function loadSavedScope(domain) {
    const session = await storage.getUiSession();
    session.mode = 'viewing_saved';
    session.target = domain;
    session.scope = (domain === 'global') ? 'global' : 'domain';
    
    const settings = await storage.getDomainSettings(domain);
    if (settings.snippets.length > 0) {
        session.activeSnippetId = settings.snippets[0].id;
    } else {
        session.activeSnippetId = null;
    }

    await storage.setUiSession(session);
    updateUI();
}

async function deleteSavedScope(domain) {
    if (confirm(`Delete ALL settings and snippets for ${domain}?`)) {
        await storage.remove([
            `${storage.KEYS.SNIPPETS_PREFIX}${domain}`, 
            `${storage.KEYS.TAGS_PREFIX}${domain}`, 
            `${storage.KEYS.GTAG_PREFIX}${domain}`, 
            `${storage.KEYS.REFERRER_PREFIX}${domain}`
        ]);
        const session = await storage.getUiSession();
        if (session.target === domain) {
            session.mode = 'active_tab';
            session.target = '';
            session.activeSnippetId = null;
            await storage.setUiSession(session);
        }
        updateUI();
    }
}

async function addTag() {
    const tag = addTagInput.value.trim();
    if (!tag) return;

    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    if (!domain) return;

    const tags = await storage.getDomainTags(domain);
    if (!tags.includes(tag)) {
        tags.push(tag);
        await storage.setDomainTags(domain, tags);
        addTagInput.value = '';
        updateUI();
    }
}

async function removeTag(tagToRemove) {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    if (!domain) return;

    let tags = await storage.getDomainTags(domain);
    tags = tags.filter(t => t !== tagToRemove);
    await storage.setDomainTags(domain, tags);
    updateUI();
}

async function addSnippet() {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    
    if (!domain) return;

    const settings = await storage.getDomainSettings(domain);
    const newSnippet = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: 'New Snippet',
        code: '',
        enabled: true
    };

    settings.snippets.push(newSnippet);
    await storage.setDomainSnippets(domain, settings.snippets);
    
    session.activeSnippetId = newSnippet.id;
    await storage.setUiSession(session);
    updateUI();
}

async function addDarkModeSnippet() {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    
    if (!domain) return;

    const settings = await storage.getDomainSettings(domain);
    const newSnippet = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: 'Dark Mode Template',
        code: `html {
    filter: invert(.9) hue-rotate(180deg) saturate(1.5) brightness(1.1);
    background-color: #ddd;
}

img[src],
video[src],
[class*="img"],
[class*="image"] {
    filter: invert(1) hue-rotate(180deg);
}`,
        enabled: true
    };

    settings.snippets.push(newSnippet);
    await storage.setDomainSnippets(domain, settings.snippets);
    
    session.activeSnippetId = newSnippet.id;
    await storage.setUiSession(session);
    updateUI();
}

async function selectSnippet(id) {
    const session = await storage.getUiSession();
    session.activeSnippetId = id;
    await storage.setUiSession(session);
    updateUI();
}

async function toggleSnippet(id, enabled) {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    const settings = await storage.getDomainSettings(domain);
    
    const snippet = settings.snippets.find(s => s.id === id);
    if (snippet) {
        snippet.enabled = enabled;
        await storage.setDomainSnippets(domain, settings.snippets);
        triggerInjection(session.scope, domain);
    }
}

async function deleteSnippet(id) {
    if (!confirm('Delete this snippet?')) return;

    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    const settings = await storage.getDomainSettings(domain);
    
    settings.snippets = settings.snippets.filter(s => s.id !== id);
    await storage.setDomainSnippets(domain, settings.snippets);
    
    if (session.activeSnippetId === id) {
        session.activeSnippetId = settings.snippets.length > 0 ? settings.snippets[0].id : null;
        await storage.setUiSession(session);
    }
    
    updateUI();
    triggerInjection(session.scope, domain);
}

async function saveCurrentSnippet() {
    const session = await storage.getUiSession();
    if (!session.activeSnippetId) return;

    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    const settings = await storage.getDomainSettings(domain);
    
    const snippet = settings.snippets.find(s => s.id === session.activeSnippetId);
    if (snippet) {
        snippet.name = snippetNameInput.value;
        snippet.code = cssInput.value;
        await storage.setDomainSnippets(domain, settings.snippets);
        showStatus('Snippet Saved!');
        triggerInjection(session.scope, domain);
    }
}

const livePreview = debounce(async () => {
    const enabled = await storage.isInjectorEnabled();
    if (!enabled) return;

    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');

    chrome.runtime.sendMessage({ 
        action: 'insertCss', 
        scope: session.scope,
        domain: domain,
        previewCode: cssInput.value 
    });
}, 300);

function triggerInjection(scope, domain) {
    chrome.runtime.sendMessage({ 
        action: 'insertCss', 
        scope: scope,
        domain: domain 
    });
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
    
    scopeGlobal.checked = (session.scope === 'global');
    scopeDomain.checked = (session.scope === 'domain');

    if (session.scope === 'global') {
        domainDisplay.textContent = 'Scope: Global Session';
    } else if (session.mode === 'active_tab') {
        domainDisplay.textContent = currentTabDomain ? `Active Domain: ${currentTabDomain}` : 'Navigate to a website';
    } else {
        domainDisplay.textContent = `Viewing Saved: ${session.target}`;
    }

    const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    const domainSettings = await storage.getDomainSettings(lookupTarget);

    toggleGtag.checked = domainSettings.gtag;
    toggleReferrer.checked = domainSettings.referrer;

    const enabled = await storage.isInjectorEnabled();
    masterToggle.checked = enabled;
    [cssInput, addSnippetBtn, addDarkmodeBtn, snippetNameInput, saveSnippetBtn, scopeDomain, scopeGlobal, toggleGtag, toggleReferrer, addTagInput, addTagBtn].forEach(el => el.disabled = !enabled);
    
    const theme = await storage.getThemePreference();
    themeSelect.value = theme;

    renderTags(domainSettings.tags);
    renderSnippetList(domainSettings.snippets, session.activeSnippetId);
    updateSavedScopesList();
}

// --- Initial Load ---

(async () => {
    await applyTheme();
    watchThemeChanges();
    
    const session = await storage.getUiSession();
    if (!session.activeSnippetId) {
        const lookupTarget = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
        const settings = await storage.getDomainSettings(lookupTarget);
        if (settings.snippets.length > 0) {
            session.activeSnippetId = settings.snippets[0].id;
            await storage.setUiSession(session);
        }
    }

    updateUI();
})();

// --- Listeners ---

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
});

chrome.tabs.onActivated.addListener(updateUI);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') updateUI();
});

scopeDomain.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    session.scope = 'domain';
    session.mode = 'active_tab';
    session.activeSnippetId = null;
    await storage.setUiSession(session);
    updateUI();
});

scopeGlobal.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    session.scope = 'global';
    session.mode = 'active_tab';
    session.activeSnippetId = null;
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

addTagBtn.addEventListener('click', addTag);
addTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTag();
});

addSnippetBtn.addEventListener('click', addSnippet);
addDarkmodeBtn.addEventListener('click', addDarkModeSnippet);
saveSnippetBtn.addEventListener('click', saveCurrentSnippet);
cssInput.addEventListener('input', livePreview);

toggleGtag.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    await storage.setDomainSettings(domain, { gtag: toggleGtag.checked });
});

toggleReferrer.addEventListener('change', async () => {
    const session = await storage.getUiSession();
    const domain = (session.mode === 'active_tab' && session.scope === 'domain') ? currentTabDomain : (session.target || 'global');
    await storage.setDomainSettings(domain, { referrer: toggleReferrer.checked });
});
