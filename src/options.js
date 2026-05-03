'use strict';

const settingsBody = document.getElementById('settings-body');
const searchInput = document.getElementById('search-input');
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
    const allStorage = await chrome.storage.local.get(null);
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
        if (key.startsWith('css_')) type = 'CSS';
        else if (key.startsWith('gtag_')) type = 'GTag';
        else if (key.startsWith('referrer_')) type = 'Referrer';
        else if (key === 'ui_session') type = 'Session';
        else if (key === 'injector_enabled') type = 'Global Toggle';
        
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

function updateGlobalState(storage) {
    const content = document.getElementById('global-state-content');
    content.innerHTML = '';
    
    const session = storage.ui_session || {};
    const enabled = storage.injector_enabled !== false;
    
    const info = document.createElement('div');
    info.style.lineHeight = '1.6';
    info.innerHTML = `
        <div><strong>Injector Enabled:</strong> ${enabled ? '✅ Yes' : '❌ No'}</div>
        <div><strong>Current UI Scope:</strong> ${session.scope || 'N/A'}</div>
        <div><strong>Current UI Mode:</strong> ${session.mode || 'N/A'}</div>
        <div><strong>Current UI Target:</strong> ${session.target || 'N/A'}</div>
    `;
    content.appendChild(info);
}

function openEditModal(key, value) {
    currentEditingKey = key;
    modalTitle.textContent = `Edit: ${key}`;
    editArea.value = typeof value === 'object' ? JSON.stringify(value, null, 4) : value;
    editModal.style.display = 'flex';
}

async function saveEdit() {
    let value = editArea.value;
    
    // Try to parse as JSON if it looks like JSON or if it's a known object key
    if (currentEditingKey === 'ui_session' || value.trim().startsWith('{') || value.trim().startsWith('[')) {
        try {
            value = JSON.parse(value);
        } catch (e) {
            // If it fails but was supposed to be JSON, maybe alert the user
            if (currentEditingKey === 'ui_session') {
                alert('Invalid JSON for ui_session');
                return;
            }
        }
    }
    
    // Handle booleans for gtag/referrer
    if (currentEditingKey.startsWith('gtag_') || currentEditingKey.startsWith('referrer_') || currentEditingKey === 'injector_enabled') {
        if (value === 'true') value = true;
        if (value === 'false') value = false;
    }

    await chrome.storage.local.set({ [currentEditingKey]: value });
    editModal.style.display = 'none';
    loadSettings();
}

async function deleteKey(key) {
    if (confirm(`Are you sure you want to delete "${key}"?`)) {
        await chrome.storage.local.remove(key);
        loadSettings();
    }
}

async function exportConfig() {
    const allStorage = await chrome.storage.local.get(null);
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
            await chrome.storage.local.clear();
            await chrome.storage.local.set(config);
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
btnExport.addEventListener('click', exportConfig);
btnImport.addEventListener('click', () => importModal.style.display = 'flex');
btnReset.addEventListener('click', async () => {
    if (confirm('REALLY delete EVERYTHING? This cannot be undone.')) {
        await chrome.storage.local.clear();
        loadSettings();
    }
});

btnSaveEdit.addEventListener('click', saveEdit);
btnCancelEdit.addEventListener('click', () => editModal.style.display = 'none');
closeModal.addEventListener('click', () => editModal.style.display = 'none');

btnConfirmImport.addEventListener('click', importConfig);
btnCancelImport.addEventListener('click', () => importModal.style.display = 'none');
closeImport.addEventListener('click', () => importModal.style.display = 'none');

// Close modals on outside click
window.onclick = (event) => {
    if (event.target === editModal) editModal.style.display = 'none';
    if (event.target === importModal) importModal.style.display = 'none';
};

// Initial load
loadSettings();
