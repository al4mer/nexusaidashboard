/**
 * NexusAI API Client
 * Handles all communication with the Cloudflare Worker backend
 */

const NexusAPI = {
    // Configuration - Update this to your Cloudflare Worker URL
    baseUrl: 'https://your-worker.your-subdomain.workers.dev',

    /**
     * Set the base URL for API calls
     * @param {string} url - The Cloudflare Worker URL
     */
    setBaseUrl(url) {
        this.baseUrl = url.replace(/\/$/, '');
    },

    /**
     * Get authorization header with Discord token
     * @returns {object} Headers object
     */
    getHeaders() {
        const token = localStorage.getItem('nexus_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    },

    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {object} options - Fetch options
     * @returns {Promise<any>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = { ...this.getHeaders(), ...options.headers };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('nexus_token');
                localStorage.removeItem('nexus_user');
                window.location.href = 'index.html';
                throw new Error('Session expired');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Request failed' }));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },

    // ==========================================
    // Authentication Endpoints
    // ==========================================

    /**
     * Exchange OAuth code for token
     * @param {string} code - OAuth authorization code
     * @returns {Promise<object>} Token and user data
     */
    async handleCallback(code) {
        const response = await fetch(`${this.baseUrl}/auth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
            throw new Error(error.message || 'Authentication failed');
        }

        return response.json();
    },

    // ==========================================
    // User Endpoints
    // ==========================================

    /**
     * Get current user info
     * @returns {Promise<object>} User data
     */
    async getUser() {
        return this.request('/api/user');
    },

    // ==========================================
    // Guild/Server Endpoints
    // ==========================================

    /**
     * Get all guilds (servers) for the user
     * @returns {Promise<Array>} List of guilds
     */
    async getGuilds() {
        return this.request('/api/guilds');
    },

    // ==========================================
    // Settings Endpoints
    // ==========================================

    /**
     * Get guild settings
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<object>} Guild settings
     */
    async getGuildSettings(guildId) {
        return this.request(`/api/guilds/${guildId}/settings`);
    },

    /**
     * Update language setting
     * @param {string} guildId - Discord guild ID
     * @param {string} language - Language code
     * @returns {Promise<object>} Updated settings
     */
    async updateLanguage(guildId, language) {
        return this.request(`/api/guilds/${guildId}/settings/language`, {
            method: 'POST',
            body: JSON.stringify({ language })
        });
    },

    /**
     * Update AI channel setting
     * @param {string} guildId - Discord guild ID
     * @param {string} channelId - Discord channel ID
     * @returns {Promise<object>} Updated settings
     */
    async updateChannel(guildId, channelId) {
        return this.request(`/api/guilds/${guildId}/settings/channel`, {
            method: 'POST',
            body: JSON.stringify({ channelId })
        });
    },

    /**
     * Get guild channels
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Array>} List of channels
     */
    async getChannels(guildId) {
        return this.request(`/api/guilds/${guildId}/channels`);
    },

    // ==========================================
    // Personality Endpoints
    // ==========================================

    /**
     * Get AI personality for a guild
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<object>} Personality settings
     */
    async getPersonality(guildId) {
        return this.request(`/api/guilds/${guildId}/personality`);
    },

    /**
     * Update AI personality
     * @param {string} guildId - Discord guild ID
     * @param {object} personality - Personality data
     * @returns {Promise<object>} Updated personality
     */
    async updatePersonality(guildId, personality) {
        return this.request(`/api/guilds/${guildId}/personality`, {
            method: 'POST',
            body: JSON.stringify(personality)
        });
    },

    // ==========================================
    // Auto Reply Endpoints
    // ==========================================

    /**
     * Update auto reply settings
     * @param {string} guildId - Discord guild ID
     * @param {object} settings - Auto reply settings
     * @returns {Promise<object>} Updated settings
     */
    async updateAutoReply(guildId, settings) {
        return this.request(`/api/guilds/${guildId}/settings/autoreply`, {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    },

    // ==========================================
    // API Keys Endpoints
    // ==========================================

    /**
     * Get all API keys for a guild
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Array>} List of API keys
     */
    async getKeys(guildId) {
        return this.request(`/api/guilds/${guildId}/keys`);
    },

    /**
     * Add a new API key
     * @param {string} guildId - Discord guild ID
     * @param {string} name - Key name
     * @param {string} key - API key value
     * @returns {Promise<object>} Added key info
     */
    async addKey(guildId, name, key) {
        return this.request(`/api/guilds/${guildId}/keys/add`, {
            method: 'POST',
            body: JSON.stringify({ name, key })
        });
    },

    /**
     * Remove an API key
     * @param {string} guildId - Discord guild ID
     * @param {string} keyId - Key ID to remove
     * @returns {Promise<object>} Removal result
     */
    async removeKey(guildId, keyId) {
        return this.request(`/api/guilds/${guildId}/keys/remove`, {
            method: 'POST',
            body: JSON.stringify({ keyId })
        });
    },

    /**
     * Rename an API key
     * @param {string} guildId - Discord guild ID
     * @param {string} keyId - Key ID to rename
     * @param {string} newName - New key name
     * @returns {Promise<object>} Updated key info
     */
    async renameKey(guildId, keyId, newName) {
        return this.request(`/api/guilds/${guildId}/keys/rename`, {
            method: 'POST',
            body: JSON.stringify({ keyId, newName })
        });
    }
};

// Make API client available globally
window.NexusAPI = NexusAPI;
