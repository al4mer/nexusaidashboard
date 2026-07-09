/**
 * NexusAI Authentication Module
 * Handles Discord OAuth2 authentication flow
 */

const NexusAuth = {
    // Discord OAuth Configuration
    // IMPORTANT: Replace these with your actual Discord application credentials
    clientId: 'YOUR_DISCORD_CLIENT_ID',
    redirectUri: 'https://your-username.github.io/nexusai-dashboard/callback.html',
    scope: 'identify guilds',

    /**
     * Generate Discord OAuth2 login URL
     * @returns {string} Discord OAuth URL
     */
    getLoginUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: this.scope,
            state: this.generateState()
        });

        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    },

    /**
     * Generate random state for CSRF protection
     * @returns {string} Random state string
     */
    generateState() {
        const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('oauth_state', state);
        return state;
    },

    /**
     * Verify OAuth state to prevent CSRF attacks
     * @param {string} state - State received from OAuth callback
     * @returns {boolean} Whether state is valid
     */
    verifyState(state) {
        const savedState = sessionStorage.getItem('oauth_state');
        return savedState && savedState === state;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        const token = localStorage.getItem('nexus_token');
        const expiry = localStorage.getItem('nexus_token_expiry');

        if (!token || !expiry) {
            return false;
        }

        // Check if token is expired
        if (new Date(expiry) < new Date()) {
            this.logout();
            return false;
        }

        return true;
    },

    /**
     * Handle OAuth callback
     * @param {string} code - Authorization code from Discord
     * @param {string} state - State parameter from Discord
     * @returns {Promise<object>} Authentication result
     */
    async handleCallback(code, state) {
        // Verify state
        if (!this.verifyState(state)) {
            throw new Error('Invalid state. Possible CSRF attack.');
        }

        sessionStorage.removeItem('oauth_state');

        // Exchange code for token via Cloudflare Worker
        const result = await NexusAPI.handleCallback(code);

        // Store token
        localStorage.setItem('nexus_token', result.token);
        localStorage.setItem('nexus_token_expiry', result.expiresAt);
        localStorage.setItem('nexus_user', JSON.stringify(result.user));

        return result;
    },

    /**
     * Get current user data
     * @returns {object|null} User data or null
     */
    getUser() {
        const userData = localStorage.getItem('nexus_user');
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_token_expiry');
        localStorage.removeItem('nexus_user');
        sessionStorage.removeItem('selectedServerId');
    },

    /**
     * Check URL for OAuth callback parameters
     * Automatically processes callback if present
     */
    async checkCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            const errorDesc = urlParams.get('error_description');
            throw new Error(errorDesc || error);
        }

        if (code && state) {
            // Remove query parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Process the callback
            return this.handleCallback(code, state);
        }

        return null;
    }
};

// Make auth module available globally
window.NexusAuth = NexusAuth;

// Auto-check for OAuth callback on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const result = await NexusAuth.checkCallback();
        if (result) {
            // Redirect to servers page after successful login
            window.location.href = 'servers.html';
        }
    } catch (error) {
        console.error('OAuth callback error:', error);
        // Show error to user
        alert('Authentication failed: ' + error.message);
    }
});
