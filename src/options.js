'use strict';

import { storage } from './utils/storage.js';
import { applyTheme, watchThemeChanges } from './utils/theme.js';

const settingsBody = document.getElementById('settings-body');
const searchInput = document.getElementById('search-input');
const themeSelect = document.getElementById('theme-select');
const btnRefresh = document.getElementById('btn-refresh');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnReset = document.getElementById('btn-reset');

const editModal = document.getElementById('edit-modal');
const editArea = document.getElementById('edit-area');
const btnSaveEdit = document.getElementById('btn-save-edit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const closeModal = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');

const importModal = document.getElementById('import-modal');
const importArea = document.getElementById('import-area');
const btnConfirmImport = document.getElementById('btn-confirm-import');
const btnCancelImport = document.getElementById('btn-cancel-import');
const closeImport = document.getElementById('close-import');

let currentEditingKey = null;

async function loadSettings() {
    const allStorage = await storage.getAll();
    const filter = searchInput.value.toLowerCase();
    
    settingsBody.innerHTML = '';
    
    const sortedKeys = Object.keys(allStorage).sort();
    
    sortedKeys.forEach(key => {
        if (filter && !key.toLowerCase().includes(filter)) return;
        
        const row = document.createElement('tr');
        
        // Key / Domain
        const keyCell = document.createElement('td');
        keyCell.textContent = key;
        
        // Type
        const typeCell = document.createElement('td');
        let type = 'Other';
        if (key.startsWith(storage.KEYS.CSS_PREFIX)) type = 'CSS';
        else if (key.startsWith(storage.KEYS.GTAG_PREFIX)) type = 'GTag';
        else if (key.startsWith(storage.KEYS.REFERRER_PREFIX)) type = 'Referrer';
        else if (key === storage.KEYS.UI_SESSION) type = 'Session';
        else if (key === storage.KEYS.INJECTOR_ENABLED) type = 'Global Toggle';
        else if (key === storage.KEYS.THEME_PREFERENCE) type = 'Theme';
        
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = type;
        typeCell.appendChild(badge);
        
        // Preview
        const previewCell = document.createElement('td');
        const pre = document.createElement('pre');
        const val = allStorage[key];
        pre.textContent = typeof val === 'object' ? JSON.stringify(val) : String(val);
        previewCell.appendChild(pre);
        
        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'actions-cell';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => openEditModal(key, val);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.onclick = () => deleteKey(key);
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(keyCell);
        row.appendChild(typeCell);
        row.appendChild(previewCell);
        row.appendChild(actionsCell);
        
        settingsBody.appendChild(row);
    });

    updateGlobalState(allStorage);
}

function updateGlobalState(allStorage) {
    const content = document.getElementById('global-state-content');
    content.innerHTML = '';
    
    const session = allStorage[storage.KEYS.UI_SESSION] || {};
    const enabled = allStorage[storage.KEYS.INJECTOR_ENABLED] !== false;
    const theme = allStorage[storage.KEYS.THEME_PREFERENCE] || 'system';
    
    const items = [
        { label: 'Injector Enabled', value: enabled ? '✅ Active' : '❌ Disabled' },
        { label: 'Current Theme', value: theme.charAt(0).toUpperCase() + theme.slice(1) },
        { label: 'UI Scope', value: session.scope || 'None' },
        { label: 'UI Mode', value: session.mode || 'None' },
        { label: 'UI Target', value: session.target || 'None' }
    ];

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'state-item';
        div.innerHTML = `
            <div class="state-label">${item.label}</div>
            <div class="state-value">${item.value}</div>
        `;
        content.appendChild(div);
    });

    themeSelect.value = theme;
}

function openEditModal(key, value) {
    currentEditingKey = key;
    modalTitle.textContent = `Edit: ${key}`;
    editArea.value = typeof value === 'object' ? JSON.stringify(value, null, 4) : value;
    editModal.style.display = 'flex';
}

async function saveEdit() {
    let value = editArea.value;
    
    if (currentEditingKey === storage.KEYS.UI_SESSION || value.trim().startsWith('{') || value.trim().startsWith('[')) {
        try {
            value = JSON.parse(value);
        } catch (e) {
            if (currentEditingKey === storage.KEYS.UI_SESSION) {
                alert('Invalid JSON for ui_session');
                return;
            }
        }
    }
    
    if (currentEditingKey.startsWith(storage.KEYS.GTAG_PREFIX) || 
        currentEditingKey.startsWith(storage.KEYS.REFERRER_PREFIX) || 
        currentEditingKey === storage.KEYS.INJECTOR_ENABLED) {
        if (value === 'true') value = true;
        if (value === 'false') value = false;
    }

    await storage.set({ [currentEditingKey]: value });
    editModal.style.display = 'none';
    loadSettings();
}

async function deleteKey(key) {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
        await storage.remove(key);
        loadSettings();
    }
}

async function exportConfig() {
    const allStorage = await storage.getAll();
    const blob = new Blob([JSON.stringify(allStorage, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `css-injector-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function importConfig() {
    try {
        const config = JSON.parse(importArea.value);
        if (confirm('This will overwrite existing settings. Continue?')) {
            await storage.clear();
            await storage.set(config);
            importModal.style.display = 'none';
            importArea.value = '';
            loadSettings();
            alert('Import successful!');
        }
    } catch (e) {
        alert('Invalid JSON configuration.');
    }
}

// Event Listeners
btnRefresh.addEventListener('click', loadSettings);
searchInput.addEventListener('input', loadSettings);
themeSelect.addEventListener('change', async () => {
    await storage.setThemePreference(themeSelect.value);
});

btnExport.addEventListener('click', exportConfig);
btnImport.addEventListener('click', () => importModal.style.display = 'flex');
btnReset.addEventListener('click', async () => {
    if (confirm('REALLY delete EVERYTHING? This cannot be undone.')) {
        await storage.clear();
        loadSettings();
    }
});

btnSaveEdit.addEventListener('click', saveEdit);
btnCancelEdit.addEventListener('click', () => editModal.style.display = 'none');
closeModal.addEventListener('click', () => editModal.style.display = 'none');

btnConfirmImport.addEventListener('click', importConfig);
btnCancelImport.addEventListener('click', () => importModal.style.display = 'none');
closeImport.addEventListener('click', () => importModal.style.display = 'none');

window.onclick = (event) => {
    if (event.target === editModal) editModal.style.display = 'none';
    if (event.target === importModal) importModal.style.display = 'none';
};

// Initial load
(async () => {
    await applyTheme();
    watchThemeChanges();
    loadSettings();
})();
