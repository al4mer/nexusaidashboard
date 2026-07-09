/**
 * NexusAI Dashboard Configuration
 *
 * IMPORTANT: Update these values before deploying to GitHub Pages
 */

const NexusConfig = {
    // Discord Application Client ID
    // Get this from: https://discord.com/developers/applications
    discordClientId: '1521537524462391447',

    // Cloudflare Worker URL
    // Your deployed worker base URL
    workerUrl: 'https://nexusaidc.alamer.workers.dev',

    // GitHub Pages URL (where this dashboard is hosted)
    // Used for OAuth redirect
    dashboardUrl: 'https://al4mer.github.io/nexusaidashboard',

    // Discord Bot Invite URL
    // Generate at: https://discord.com/developers/applications
    botInviteUrl: 'https://discord.com/oauth2/authorize?client_id=1521537524462391447&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Falamer.github.io%2Fnexusaidashboard%2Fcallback.html&integration_type=0&scope=identify+guilds+bot+applications.commands'
};

// Apply configuration to Auth and API modules
function applyConfig() {
    if (typeof NexusAuth !== 'undefined') {
        NexusAuth.clientId = NexusConfig.discordClientId;
        NexusAuth.redirectUri = `${NexusConfig.dashboardUrl}/callback.html`;
    }

    if (typeof NexusAPI !== 'undefined') {
        NexusAPI.setBaseUrl(NexusConfig.workerUrl);
    }

    if (typeof WORKER_URL !== 'undefined') {
        WORKER_URL = NexusConfig.workerUrl;
    }
}

// Auto-apply configuration when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyConfig);
} else {
    applyConfig();
}

window.NexusConfig = NexusConfig;
