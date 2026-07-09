/**
 * NexusAI Dashboard Configuration
 *
 * IMPORTANT: Update these values before deploying to GitHub Pages
 */

const NexusConfig = {
    // Discord Application Client ID
    // Get this from: https://discord.com/developers/applications
    discordClientId: 'YOUR_DISCORD_CLIENT_ID',

    // Cloudflare Worker URL
    // Your deployed worker base URL
    workerUrl: 'https://your-worker.your-subdomain.workers.dev',

    // GitHub Pages URL (where this dashboard is hosted)
    // Used for OAuth redirect
    dashboardUrl: 'https://your-username.github.io/nexusai-dashboard',

    // Discord Bot Invite URL
    // Generate at: https://discord.com/developers/applications
    botInviteUrl: 'https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands'
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
}

// Auto-apply configuration when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyConfig);
} else {
    applyConfig();
}

window.NexusConfig = NexusConfig;
