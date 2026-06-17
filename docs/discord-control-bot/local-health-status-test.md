# Local Test: Discord Adapter Health and Status

## Purpose

Validate the experimental read-only Discord adapter health/status path before adding more routes.

The adapter is disabled by default and requires a dedicated Dune bot API token.

## Apply Server Hook

From `console/api`:

```bash
node scripts/apply-discord-server-hook.mjs
```

Review the diff before committing:

```bash
git diff -- src/server.js
```

Expected diff shape:

```diff
+import { handleDiscordAdapterRoute, isDiscordAdapterRoute } from "./integrations/discord/routes.js";
+import { discordStatusProvider } from "./integrations/discord/statusProvider.js";
...
+  if (isDiscordAdapterRoute(path)) {
+    return handleDiscordAdapterRoute({
+      req,
+      res,
+      path,
+      config,
+      readJson,
+      json,
+      statusProvider: ({ diagnostic } = {}) => discordStatusProvider(config, { diagnostic })
+    });
+  }
```

## Create Local Bot API Token

Use a local development value only.

```bash
mkdir -p ../../runtime/secrets
printf '%s\n' 'local-dev-bot-api' > ../../runtime/secrets/dune-bot-api-token.txt
chmod 600 ../../runtime/secrets/dune-bot-api-token.txt
```

## Start API with Adapter Enabled

```bash
DUNE_DISCORD_ADAPTER_ENABLED=true \
DUNE_BOT_API_TOKEN_FILE=../../runtime/secrets/dune-bot-api-token.txt \
npm start
```

## Test Health

```bash
curl -i \
  -H 'Authorization: Bearer local-dev-bot-api' \
  http://127.0.0.1:8088/api/integrations/discord/health
```

Expected:

```json
{
  "ok": true,
  "service": "dune-console-discord-adapter",
  "experimental": true,
  "readOnly": true,
  "writesEnabled": false
}
```

## Test Status

```bash
curl -i \
  -H 'Authorization: Bearer local-dev-bot-api' \
  -H 'Content-Type: application/json' \
  -d '{"actor":{"guildId":"local","channelId":"local","userId":"local","username":"local","roleIds":[],"commandName":"/dune status"},"diagnostic":false}' \
  http://127.0.0.1:8088/api/integrations/discord/status
```

Expected:

- `200 OK`.
- `ok: true`.
- No `ssh_host` in public result.
- No internal IPs.
- No tokens.
- No raw `.env` content.
- No host paths.

## Negative Tests

Disabled adapter:

```bash
npm start
curl -i -H 'Authorization: Bearer local-dev-bot-api' http://127.0.0.1:8088/api/integrations/discord/health
```

Expected: `404` with `adapter_disabled`.

Missing token:

```bash
DUNE_DISCORD_ADAPTER_ENABLED=true npm start
curl -i http://127.0.0.1:8088/api/integrations/discord/health
```

Expected: `401` with `missing_bot_token`.

Invalid token:

```bash
curl -i -H 'Authorization: Bearer wrong' http://127.0.0.1:8088/api/integrations/discord/health
```

Expected: `401` with `invalid_bot_token`.
