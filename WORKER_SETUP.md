# Cloudflare Worker Setup

## 1. D1 Database erstellen

```bash
# Falls du Wrangler CLI hast:
wrangler d1 create nexusai-db

# Notiere die database_id
```

## 2. Worker Code deployen

Kopiere den Inhalt von `worker.js` in deinen Cloudflare Worker.

## 3. Environment Variables setzen

Im Cloudflare Dashboard > Workers > nexusaidc > Settings > Variables:

| Variable | Wert |
|----------|------|
| `DISCORD_CLIENT_ID` | `1521537524462391447` |
| `DISCORD_CLIENT_SECRET` | Dein Discord Application Secret |
| `DISCORD_BOT_TOKEN` | Dein Discord Bot Token |
| `REDIRECT_URI` | `https://al4mer.github.io/nexusaidashboard/callback.html` |
| `JWT_SECRET` | Zufälliger String (z.B. `nexusai-secret-key-2024`) |

## 4. D1 Binding

Im Cloudflare Dashboard > Workers > nexusaidc > Settings > Bindings:

- Type: D1 Database
- Variable name: `DB`
- D1 Database: nexusai-db (oder deine DB)

## 5. Discord Bot Token bekommen

1. [Discord Developer Portal](https://discord.com/developers/applications)
2. Deine App wählen > Bot
3. "Reset Token" > Kopiere das Token
4. Setze als `DISCORD_BOT_TOKEN`
