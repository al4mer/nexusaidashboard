# NexusAI Dashboard

A modern, dark-themed Discord bot dashboard for managing NexusAI settings across multiple servers.

## Features

- Discord OAuth2 authentication
- Multi-server management
- AI Personality customization
- Auto-reply configuration
- Groq API key management
- Language and channel settings
- Fully responsive design

## Files

```
nexusai-dashboard/
├── index.html          # Login page with Discord OAuth
├── servers.html        # Server list selection
├── dashboard.html      # Main dashboard with all settings
├── callback.html       # OAuth callback handler
├── assets/
│   ├── config.js      # Configuration (MUST edit before deploy)
│   ├── style.css      # Dark theme styling
│   ├── api.js         # Cloudflare Worker API client
│   ├── auth.js        # OAuth authentication logic
│   └── dashboard.js   # Dashboard interactions
└── README.md
```

## Setup

### 1. Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Note your **Application ID** (Client ID)
4. Go to OAuth2 > General
5. Add redirect URL: `https://YOUR_USERNAME.github.io/nexusai-dashboard/callback.html`
6. Save changes

### 2. Configure Dashboard

Edit `assets/config.js`:

```javascript
const NexusConfig = {
    discordClientId: 'YOUR_DISCORD_CLIENT_ID',
    workerUrl: 'https://your-worker.your-subdomain.workers.dev',
    dashboardUrl: 'https://your-username.github.io/nexusai-dashboard',
    botInviteUrl: 'https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands'
};
```

### 3. Cloudflare Worker Backend

You need a Cloudflare Worker that handles these endpoints:

```
POST /auth/callback        # Exchange OAuth code for token
GET  /api/user             # Get current user info
GET  /api/guilds           # Get user's Discord servers
GET  /api/guilds/:id/settings
POST /api/guilds/:id/settings/language
POST /api/guilds/:id/settings/channel
POST /api/guilds/:id/settings/autoreply
GET  /api/guilds/:id/channels
GET  /api/guilds/:id/personality
POST /api/guilds/:id/personality
GET  /api/guilds/:id/keys
POST /api/guilds/:id/keys/add
POST /api/guilds/:id/keys/remove
POST /api/guilds/:id/keys/rename
```

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push all files to the repository
3. Go to Settings > Pages
4. Select source: Deploy from a branch
5. Select branch: main, folder: / (root)
6. Save

Your dashboard will be live at: `https://YOUR_USERNAME.github.io/nexusai-dashboard/`

## Local Development

```bash
# Install dependencies
npm install

# Start local server
npm start
```

Then open http://localhost:3000

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
