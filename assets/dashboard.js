/**
 * NexusAI Dashboard Logic (D1 Version)
 * Handles all dashboard interactions and data management
 */

// Worker URL aus Config (wird durch config.js gesetzt)
let WORKER_URL = "https://nexusaidc.alamer.workers.dev";

// Global state
let currentServerId = null;
let serverData = {
    settings: null,
    personality: null,
    channels: [],
    keys: []
};

// Personality presets
const PERSONALITY_PRESETS = {
    assistant: {
        name: 'NexusAI',
        prompt: 'You are a helpful, friendly AI assistant. Be concise but thorough in your responses. Always be polite and supportive. Use clear, easy-to-understand language.',
        tone: 'friendly',
        style: 'balanced',
        memory: true
    },
    expert: {
        name: 'NexusAI Expert',
        prompt: 'You are an expert AI with deep knowledge across many technical domains. Provide detailed, accurate information with sources when possible. Be professional and direct. Focus on technical accuracy and depth.',
        tone: 'professional',
        style: 'detailed',
        memory: true
    },
    entertainer: {
        name: 'NexusAI',
        prompt: 'You are a fun, witty AI with a great sense of humor. Make responses engaging and entertaining while still being helpful. Use puns, jokes, and a conversational tone.',
        tone: 'witty',
        style: 'concise',
        memory: true
    },
    custom: {
        name: 'NexusAI',
        prompt: '',
        tone: 'friendly',
        style: 'balanced',
        memory: false
    }
};

/**
 * Load from Worker (D1)
 */
async function loadFromWorker(guildId) {
    const res = await fetch(`${WORKER_URL}/load?guildId=${guildId}`);
    if (!res.ok) return {};
    return await res.json();
}

/**
 * Save to Worker (D1)
 */
async function saveToWorker() {
    const payload = {
        settings: serverData.settings || {},
        personality: serverData.personality || null,
        keys: serverData.keys || []
    };

    await fetch(`${WORKER_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            guildId: currentServerId,
            data: payload
        })
    });
}

/**
 * Initialize the dashboard
 * @param {string} serverId - Discord guild ID
 */
async function initDashboard(serverId) {
    currentServerId = serverId;

    showLoading(true);

    try {
        // Load stored data from Worker + channels from Discord
        const [stored, channels] = await Promise.all([
            loadFromWorker(serverId).catch(() => ({})),
            NexusAPI.getChannels(serverId).catch(() => [])
        ]);

        serverData.settings = stored.settings || {};
        serverData.personality = stored.personality || null;
        serverData.keys = stored.keys || [];
        serverData.channels = channels || [];

        // Update UI
        updateServerHeader();
        updateOverview();
        populateSettings();
        populatePersonality();
        populateAutoReply();
        populateKeys();

        showToast('Dashboard loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Failed to load server data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update server header with server info
 */
function updateServerHeader() {
    const serverInfo = JSON.parse(sessionStorage.getItem('serverInfo') || '{}');

    if (serverInfo.icon) {
        document.getElementById('serverIcon').innerHTML =
            `<img src="https://cdn.discordapp.com/icons/${currentServerId}/${serverInfo.icon}.png?size=40" alt="">`;
    }

    document.getElementById('serverName').textContent = serverInfo.name || 'Server';
    document.getElementById('serverId').textContent = `ID: ${currentServerId}`;
}

/**
 * Update overview statistics
 */
function updateOverview() {
    const settings = serverData.settings || {};

    document.getElementById('messagesToday').textContent = settings.messagesToday || '--';
    document.getElementById('botStatus').textContent = settings.active ? 'Active' : 'Inactive';
    document.getElementById('botStatus').className = settings.active ? 'stat-value stat-active' : 'stat-value';

    document.getElementById('apiKeysCount').textContent = serverData.keys?.length || 0;

    const channel = serverData.channels?.find(c => c.id === settings.aiChannel);
    document.getElementById('aiChannel').textContent = channel ? `#${channel.name}` : 'Not set';
}

/**
 * Populate settings tab
 */
function populateSettings() {
    const settings = serverData.settings || {};
    const channels = serverData.channels || [];

    document.getElementById('languageSelect').value = settings.language || 'en';
    document.getElementById('autoDetect').checked = settings.autoDetect || false;

    const channelSelect = document.getElementById('channelSelect');
    channelSelect.innerHTML = '<option value="">-- Select a channel --</option>';

    channels.filter(c => c.type === 0).forEach(channel => {
        const option = document.createElement('option');
        option.value = channel.id;
        option.textContent = `# ${channel.name}`;
        if (channel.id === settings.aiChannel) {
            option.selected = true;
        }
        channelSelect.appendChild(option);
    });

    document.getElementById('allChannels').checked = settings.allChannels || false;
    document.getElementById('channelPrefix').value = settings.prefix || 'ai';

    if (settings.allChannels) {
        channelSelect.disabled = true;
    }
}

/**
 * Populate personality tab
 */
function populatePersonality() {
    const personality = serverData.personality || PERSONALITY_PRESETS.assistant;

    document.getElementById('personalityName').value = personality.name || 'NexusAI';
    document.getElementById('personalityPrompt').value = personality.prompt || '';
    document.getElementById('personalityTone').value = personality.tone || 'friendly';
    document.getElementById('personalityStyle').value = personality.style || 'balanced';
    document.getElementById('personalityMemory').checked = personality.memory !== false;
}

/**
 * Populate auto reply tab
 */
function populateAutoReply() {
    const settings = serverData.settings || {};

    document.getElementById('autoreplyEnabled').checked = settings.autoReplyEnabled || false;
    document.getElementById('autoreplyStatus').textContent = settings.autoReplyEnabled ? 'Enabled' : 'Disabled';
    document.getElementById('responseChance').value = settings.responseChance || 100;
    document.getElementById('responseChanceValue').textContent = `${settings.responseChance || 100}%`;
    document.getElementById('cooldown').value = settings.cooldown || 3;
    document.getElementById('triggerKeywords').value = (settings.triggerKeywords || []).join(', ');
    document.getElementById('ignoreKeywords').value = (settings.ignoreKeywords || []).join(', ');
    document.getElementById('maxPerUser').value = settings.maxPerUser || 50;
    document.getElementById('maxTotal').value = settings.maxTotal || 200;
}

/**
 * Populate API keys list
 */
function populateKeys() {
    const keys = serverData.keys || [];
    const keysList = document.getElementById('keysList');
    const keysCount = document.getElementById('keysCount');

    keysCount.textContent = `${keys.length} key${keys.length !== 1 ? 's' : ''}`;

    if (keys.length === 0) {
        keysList.innerHTML = `
            <div class="empty-keys">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5l3 3"/>
                </svg>
                <p>No API keys added yet</p>
                <span>Add your first Groq API key above to get started</span>
            </div>
        `;
        return;
    }

    keysList.innerHTML = keys.map((key) => `
        <div class="key-item">
            <div class="key-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5l3 3"/>
                </svg>
            </div>
            <div class="key-info">
                <div class="key-name">${escapeHtml(key.name)}</div>
                <div class="key-value">${maskApiKey(key.key || key.keyPreview || '')}</div>
            </div>
            <div class="key-actions">
                <button class="key-action-btn" onclick="renameApiKey('${key.id}')" title="Rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                </button>
                <button class="key-action-btn delete" onclick="removeApiKey('${key.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Navigate to a specific tab
 */
function navigateToTab(tabId) {
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabId);
    });

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === `tab-${tabId}`);
    });

    window.location.hash = tabId;
}

/**
 * Save personality settings (D1)
 */
async function savePersonality() {
    const personality = {
        name: document.getElementById('personalityName').value.trim() || 'NexusAI',
        prompt: document.getElementById('personalityPrompt').value.trim(),
        tone: document.getElementById('personalityTone').value,
        style: document.getElementById('personalityStyle').value,
        memory: document.getElementById('personalityMemory').checked
    };

    showLoading(true);

    try {
        serverData.personality = personality;
        await saveToWorker();
        showToast('Personality saved successfully', 'success');
    } catch (error) {
        showToast('Failed to save personality: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetPersonality() {
    loadPreset('assistant');
}

function loadPreset(presetName) {
    const preset = PERSONALITY_PRESETS[presetName];
    if (!preset) return;

    document.getElementById('personalityName').value = preset.name;
    document.getElementById('personalityPrompt').value = preset.prompt;
    document.getElementById('personalityTone').value = preset.tone;
    document.getElementById('personalityStyle').value = preset.style;
    document.getElementById('personalityMemory').checked = preset.memory;

    showToast(`Loaded "${presetName}" preset`, 'info');
}

/**
 * Save language settings (D1)
 */
async function saveLanguage() {
    const language = document.getElementById('languageSelect').value;
    const autoDetect = document.getElementById('autoDetect').checked;

    showLoading(true);

    try {
        serverData.settings = serverData.settings || {};
        serverData.settings.language = language;
        serverData.settings.autoDetect = autoDetect;
        await saveToWorker();
        showToast('Language settings saved', 'success');
    } catch (error) {
        showToast('Failed to save language: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Save channel settings (D1)
 */
async function saveChannel() {
    const channelId = document.getElementById('channelSelect').value;
    const allChannels = document.getElementById('allChannels').checked;
    const prefix = document.getElementById('channelPrefix').value.trim();

    showLoading(true);

    try {
        serverData.settings = serverData.settings || {};
        serverData.settings.aiChannel = channelId;
        serverData.settings.allChannels = allChannels;
        serverData.settings.prefix = prefix;
        await saveToWorker();
        updateOverview();
        showToast('Channel settings saved', 'success');
    } catch (error) {
        showToast('Failed to save channel: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Save auto reply settings (D1)
 */
async function saveAutoReply() {
    const settings = {
        autoReplyEnabled: document.getElementById('autoreplyEnabled').checked,
        responseChance: parseInt(document.getElementById('responseChance').value),
        cooldown: parseInt(document.getElementById('cooldown').value) || 3,
        triggerKeywords: document.getElementById('triggerKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k),
        ignoreKeywords: document.getElementById('ignoreKeywords').value
            .split(',')
            .map(k => k.trim())
            .filter(k => k),
        maxPerUser: parseInt(document.getElementById('maxPerUser').value) || 50,
        maxTotal: parseInt(document.getElementById('maxTotal').value) || 200
    };

    showLoading(true);

    try {
        serverData.settings = serverData.settings || {};
        Object.assign(serverData.settings, settings);
        await saveToWorker();
        showToast('Auto-reply settings saved', 'success');
    } catch (error) {
        showToast('Failed to save auto-reply: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetAutoReply() {
    document.getElementById('autoreplyEnabled').checked = false;
    document.getElementById('autoreplyStatus').textContent = 'Disabled';
    document.getElementById('responseChance').value = 100;
    document.getElementById('responseChanceValue').textContent = '100%';
    document.getElementById('cooldown').value = 3;
    document.getElementById('triggerKeywords').value = '';
    document.getElementById('ignoreKeywords').value = '';
    document.getElementById('maxPerUser').value = 50;
    document.getElementById('maxTotal').value = 200;
    showToast('Auto-reply settings reset', 'info');
}

/**
 * Add a new API key (D1)
 */
async function addApiKey() {
    const name = document.getElementById('newKeyName').value.trim();
    const key = document.getElementById('newKeyValue').value.trim();

    if (!name) {
        showToast('Please enter a name for the key', 'error');
        return;
    }

    if (!key || !key.startsWith('gsk_')) {
        showToast('Please enter a valid Groq API key (starts with gsk_)', 'error');
        return;
    }

    showLoading(true);

    try {
        serverData.keys = serverData.keys || [];
        serverData.keys.push({
            id: Date.now().toString(),
            name,
            key
        });

        document.getElementById('newKeyName').value = '';
        document.getElementById('newKeyValue').value = '';

        await saveToWorker();
        populateKeys();
        updateOverview();

        showToast('API key added successfully', 'success');
    } catch (error) {
        showToast('Failed to add key: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Remove an API key (D1)
 */
async function removeApiKey(keyId) {
    if (!confirm('Are you sure you want to remove this API key?')) {
        return;
    }

    showLoading(true);

    try {
        serverData.keys = (serverData.keys || []).filter(k => k.id !== keyId);
        await saveToWorker();
        populateKeys();
        updateOverview();
        showToast('API key removed', 'success');
    } catch (error) {
        showToast('Failed to remove key: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Rename an API key (D1)
 */
async function renameApiKey(keyId) {
    const currentKey = (serverData.keys || []).find(k => k.id === keyId);
    const newName = prompt('Enter a new name for this key:', currentKey?.name || '');

    if (!newName || !newName.trim()) {
        return;
    }

    showLoading(true);

    try {
        const key = (serverData.keys || []).find(k => k.id === keyId);
        if (key) {
            key.name = newName.trim();
        }
        await saveToWorker();
        populateKeys();
        showToast('API key renamed', 'success');
    } catch (error) {
        showToast('Failed to rename key: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function toggleKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function maskApiKey(key) {
    if (!key || key.length < 8) return '****';
    return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
        navigateToTab(hash);
    }
});
