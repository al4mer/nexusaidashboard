/**
 * NexusAI Cloudflare Worker - D1 Version
 * Discord OAuth + API + D1 Database
 *
 * Required Environment Variables (set in Cloudflare Dashboard):
 * - DISCORD_CLIENT_ID: Your Discord Application Client ID
 * - DISCORD_CLIENT_SECRET: Your Discord Application Client Secret
 * - DISCORD_BOT_TOKEN: Your Discord Bot Token
 * - REDIRECT_URI: https://al4mer.github.io/nexusaidashboard/callback.html
 * - JWT_SECRET: Random string for signing tokens
 * - DB: D1 Database binding
 */

export default {
  async fetch(request, env) {
    const db = env.DB;
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // Initialize D1 Table
    // ==========================================
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS nexus_settings (
          guildId TEXT PRIMARY KEY,
          data TEXT
        )
      `);
    } catch (e) {
      // Table might exist
    }

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          userId TEXT PRIMARY KEY,
          accessToken TEXT,
          refreshToken TEXT,
          expiresAt INTEGER
        )
      `);
    } catch (e) {
      // Table might exist
    }

    // ==========================================
    // OAuth Callback - Exchange code for token
    // ==========================================
    if (path === "/auth/callback" && request.method === "POST") {
      const body = await request.json();
      const code = body.code;

      if (!code) {
        return new Response(JSON.stringify({ error: "No code provided" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      // Exchange code for Discord access token
      const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: env.REDIRECT_URI
        })
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Token exchange failed:", error);
        return new Response(JSON.stringify({ error: "Failed to exchange token" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const tokenData = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });

      const userData = await userResponse.json();

      // Store session in D1
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      await db.exec(
        `INSERT OR REPLACE INTO user_sessions (userId, accessToken, refreshToken, expiresAt) VALUES (?, ?, ?, ?)`,
        [userData.id, tokenData.access_token, tokenData.refresh_token, expiresAt]
      );

      // Generate JWT-like session token
      const sessionToken = btoa(JSON.stringify({
        userId: userData.id,
        exp: expiresAt,
        sig: await signToken(userData.id, expiresAt, env.JWT_SECRET)
      }));

      return new Response(JSON.stringify({
        token: sessionToken,
        expiresAt: new Date(expiresAt).toISOString(),
        user: userData
      }), { headers: corsHeaders });
    }

    // ==========================================
    // Get User Info
    // ==========================================
    if (path === "/api/user" && request.method === "GET") {
      const auth = await verifyAuth(request, env, db);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const userResponse = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${auth.accessToken}` }
      });

      return new Response(await userResponse.text(), { headers: corsHeaders });
    }

    // ==========================================
    // Get User Guilds
    // ==========================================
    if (path === "/api/guilds" && request.method === "GET") {
      const auth = await verifyAuth(request, env, db);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const guildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${auth.accessToken}` }
      });

      const guilds = await guildsResponse.json();

      // Filter guilds where bot is present and user has manage permissions
      // Get bot's guilds
      const botGuildsResponse = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }
      });

      let botGuilds = [];
      try {
        botGuilds = await botGuildsResponse.json();
      } catch (e) {
        botGuilds = [];
      }

      const botGuildIds = new Set(botGuilds.map(g => g.id));

      // Filter and format
      const filteredGuilds = guilds
        .filter(g => botGuildIds.has(g.id) || (g.permissions & 0x8)) // Bot in guild OR user has admin
        .map(g => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          permissions: (g.permissions & 0x8) ? 'admin' : 'manage'
        }));

      return new Response(JSON.stringify(filteredGuilds), { headers: corsHeaders });
    }

    // ==========================================
    // Get Guild Channels
    // ==========================================
    if (path.match(/^\/api\/guilds\/\d+\/channels$/) && request.method === "GET") {
      const auth = await verifyAuth(request, env, db);
      if (!auth.valid) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders
        });
      }

      const guildId = path.split("/")[3];

      const channelsResponse = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` }
      });

      const channels = await channelsResponse.json();
      return new Response(JSON.stringify(channels), { headers: corsHeaders });
    }

    // ==========================================
    // Save Settings to D1
    // ==========================================
    if (path === "/save" && request.method === "POST") {
      const body = await request.json();
      const guildId = body.guildId;
      const data = JSON.stringify(body.data);

      await db.exec(
        `INSERT OR REPLACE INTO nexus_settings (guildId, data) VALUES (?, ?)`,
        [guildId, data]
      );

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // ==========================================
    // Load Settings from D1
    // ==========================================
    if (path === "/load" && request.method === "GET") {
      const guildId = url.searchParams.get("guildId");

      if (!guildId) {
        return new Response(JSON.stringify({ error: "No guildId provided" }), {
          status: 400,
          headers: corsHeaders
        });
      }

      const result = await db
        .prepare(`SELECT data FROM nexus_settings WHERE guildId = ?`)
        .bind(guildId)
        .first();

      const data = result ? JSON.parse(result.data) : {};
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    // ==========================================
    // Default Response
    // ==========================================
    return new Response(JSON.stringify({
      name: "NexusAI D1 Worker",
      version: "2.0",
      endpoints: ["/auth/callback", "/api/user", "/api/guilds", "/api/guilds/:id/channels", "/save", "/load"]
    }), { headers: corsHeaders });
  }
};

// ==========================================
// Helper Functions
// ==========================================

async function verifyAuth(request, env, db) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false };
  }

  const token = authHeader.slice(7);

  try {
    const decoded = JSON.parse(atob(token));
    const { userId, exp, sig } = decoded;

    // Check expiration
    if (exp < Date.now()) {
      return { valid: false };
    }

    // Verify signature
    const expectedSig = await signToken(userId, exp, env.JWT_SECRET);
    if (sig !== expectedSig) {
      return { valid: false };
    }

    // Get access token from D1
    const session = await db
      .prepare(`SELECT accessToken FROM user_sessions WHERE userId = ?`)
      .bind(userId)
      .first();

    if (!session) {
      return { valid: false };
    }

    return { valid: true, accessToken: session.accessToken, userId };
  } catch (e) {
    return { valid: false };
  }
}

async function signToken(userId, exp, secret) {
  const data = `${userId}:${exp}:${secret}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Simple hash-based signature
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
