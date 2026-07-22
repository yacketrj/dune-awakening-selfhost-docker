# Discord Player-Link Hardening

Branch: `security/discord-player-link-hardening`

Upstream tracking: `Red-Blink/dune-awakening-selfhost-docker#100` (covers
FINDING-LINK-1, -2, -3, -5, -6). FINDING-LINK-4 is tracked separately and
already resolved-by-discussion in `Red-Blink/dune-awakening-selfhost-docker#72`.

Status: Findings documented and proposed. No remediation code has landed on
this branch yet; it currently contains this document only.

## Purpose

Harden the Discord character-linking flow (`/dune data link` → in-game
whisper code → `/dune data verify`) against actor spoofing, excessive
authorization scope, and verification brute-forcing, and close the gap
between documented and actual multi-character/multi-account support.

This flow is the only Discord-adapter write path that currently ships
(`discordAdapterHealth()` reports `adapterDataWrites: ["player-link"]`), so
it is the highest-value adapter surface to harden before any broader
write-capable work proceeds.

## Source Findings

All findings below were confirmed by direct code review against
`origin/main` (`e188c87`, synced with `upstream/main` at the same commit) in
this repository, and against `yacketrj/Arrakis-Control-Panel` `main`
(`1ea3316`) for the bot-side client and documentation.

### FINDING-LINK-1: Discord actor identity is an unauthenticated request-body claim (HIGH)

- **Location:** `console/api/src/integrations/discord/policy.js:59-71` (`normalizeDiscordActor`), `console/api/src/integrations/discord/routes.js:221-260` (link/verify/unlink/me routes)
- **Risk:** `actor.userId`, `actor.roleIds`, `actor.username`, `actor.guildId` are read verbatim from the JSON request body with no cryptographic binding to a real Discord interaction. The only gate on the whole adapter is a single shared bearer token (`routes.js:371-378`, `requireDiscordBotToken`) that authenticates the bot process, not the specific Discord user. Any caller holding that token can submit any `userId`/`roleIds` combination and the adapter will treat it as authentic. For the link/verify/unlink routes specifically, this means an attacker with the adapter token can link, unlink, or query the linked character for **any** Discord user ID, and can escalate their effective role tier by simply listing higher `roleIds` in the payload.
- **Recommendation:**
  1. Require Discord's own interaction signature verification (Ed25519, `X-Signature-Ed25519`/`X-Signature-Timestamp`) if the adapter is ever reachable independently of the bot process.
  2. At minimum, add a second HMAC secret (distinct from the transport bearer token) shared only between the specific bot instance and adapter, covering `(userId, guildId, channelId, roleIds, interactionId, timestamp)`, with a short freshness window (~30s) to prevent replay.
  3. Until (1) or (2) ship, treat the adapter bearer token as equivalent in sensitivity to a master credential for all linked Discord identities, not just "API access" — document this explicitly in `docs/security/` and operator secret-handling guidance.

### FINDING-LINK-2: `player-link:write` capability requires only `moderator` tier (MEDIUM)

- **Location:** `console/api/src/integrations/discord/policy.js:14,34-45` (`DISCORD_CAPABILITIES.PLAYER_LINK_WRITE` in the `moderator` tier's capability set)
- **Risk:** Combined with FINDING-LINK-1, any actor payload claiming a `moderator`-mapped role ID — a much larger population than `admin`/`owner` — can exercise the identity-binding write capability. Identity-linking has a different risk profile than the other `moderator`-tier read capabilities it's grouped with (inventory/storage/backups read); it mutates a persistent binding between a Discord account and a game account, not just a read query.
- **Recommendation:** Move `PLAYER_LINK_WRITE` to require `admin` tier, or introduce a `self-link` capability that is available to any authenticated actor for their own `discordUserId` only, separate from role-tier-gated capabilities for privileged operations.

### FINDING-LINK-3: No rate limiting or lockout on verification attempts (MEDIUM)

- **Location:** `console/api/src/integrations/discord/linkProvider.js:94-116` (`verifyPlayerLinkProvider`), `console/api/src/duneDb.js:4951-4959` (`consumePendingLink`)
- **Risk:** Verification codes are 6 characters from a 32-symbol alphabet (`console/api/src/integrations/discord/linkProvider.js:15,18-25`), giving ~30 bits of entropy, valid for 5 minutes, with zero attempt throttling. `consumePendingLink` is scoped to `(code, discord_user_id)`, so brute-forcing requires knowing the target's Discord ID — but that ID is itself attacker-suppliable per FINDING-LINK-1, so an attacker holding the adapter token can pick a target `discordUserId` and attempt many codes with no lockout, backoff, or alerting.
- **Recommendation:**
  1. Add per-`(discordUserId)` attempt throttling (e.g. 5 attempts per pending code, then force regeneration) to `verifyPlayerLinkProvider`.
  2. Consider increasing code length/entropy (e.g. 8 chars ≈ 40 bits) or switching to a copy-paste-friendly token if the whisper delivery channel supports longer strings without truncation.
  3. Emit an audit/log event on repeated failed verification for the same pending code so operators can detect probing.

### FINDING-LINK-4: Hardcoded command-auth token fallback was fixed, then reverted upstream — root cause is a two-sided synchronization gap, not a rollback mistake (HIGH — regression, tracked upstream)

- **Location:** `console/api/src/rmq.js:6,230-233` (`BUILTIN_COMMAND_AUTH_TOKEN`, `commandAuthToken()`)
- **History:** This exact issue was previously documented as `FINDING-CORE-1` in `yacketrj/Arrakis-Control-Panel:docs/security-audit/2026-07-04-comprehensive-security-audit.md` and fixed on `security/generated-command-auth-token-fix` (merged to `main` via `c079434` on 2026-06-27/28). It was then **explicitly reverted** by upstream maintainer `Red-Blink` in commit `52008a7` ("Restore built-in command auth token fallback", 2026-07-07), present on both `origin/main` and `upstream/main` (both at `e188c87`). This was already discussed and closed as **`Red-Blink/dune-awakening-selfhost-docker#72`** ("[Discussion] RabbitMQ / Command Auth Token", opened by `drkshrk`, closed 2026-07-17).
- **Root cause per maintainer (`Red-Blink`, issue #72, 2026-07-09):** the `AuthToken` field is embedded in the Dune server-command payload and validated by the **game server/director's command consumer**, not by RabbitMQ itself. A locally-generated console-side token only works if the game server consumer is configured with that *exact same* value. Today there is no mechanism to synchronize a generated token to both sides, so generating a local token unilaterally broke deployments where the game server still expected the built-in default. The maintainer's stated position: keep the built-in fallback as the safe default, and treat `DUNE_COMMAND_AUTH_TOKEN` as an "advanced override" only for operators who also update the game-server side. `RABBITMQ_ERLANG_COOKIE` (suggested in the issue as a possible alternative lever) is unrelated — it governs RabbitMQ node/CLI distribution auth, not this application-level token.
- **Risk:** `publishServerCommand()` (used for admin broadcasts, shutdown scheduling, etc.) currently falls back to a publicly known, source-controlled token whenever `DUNE_COMMAND_AUTH_TOKEN` is unset, and per the maintainer this is deliberate, not an oversight. This is not part of the whisper/link path directly (`publishCarePackageWhisper()` does not call `commandAuthToken()`), but it shares the same RMQ trust boundary and `dockerExec()`/`rabbitmqctl eval` mechanism that the whisper delivery depends on, so a compromised command channel is a plausible path to forging or disrupting whisper delivery.
- **Recommendation:** Do not re-attempt a console-only token generation fix — it will hit the same synchronization gap and likely be reverted again. The real fix, per the maintainer, requires locating where the game server/director reads its expected command-auth token and wiring a synchronized override mechanism on both the console and the game-server side (e.g. writing the generated token to a location or config the game server also reads at startup). This is out of scope for `docs/security/discord-player-link-hardening.md` specifically — track it as its own effort, cross-referencing issue #72, and do not close it as "won't fix" without addressing the two-sided sync requirement the maintainer identified. The unmerged `security/core-remove-hardcoded-command-token` branch (predates #72's discussion) should not be revived as-is since it repeats the same one-sided approach.

### FINDING-LINK-5: Whisper transport depends on Docker socket + string-templated Erlang (LOW/architectural)

- **Location:** `console/api/src/rmq.js:145-174` (`publishCarePackageWhisper`), `console/api/src/rmq.js:235-252` (`dockerExec`)
- **Risk:** Whisper delivery shells out to `docker exec dune-rmq-game rabbitmqctl eval "<Erlang>"`, building the Erlang term via string interpolation of base64-encoded, regex-validated fields (`validateWhisperIdentity`, `validateHexFlsId`, etc., `rmq.js:280-321`). Current input validation is reasonably strict (allowlist regexes reject the characters needed to break out of the base64 wrapper), so this is not an active injection vulnerability today, but it is architecturally fragile: every new whisper-sending feature must independently get this right, and the console process needs Docker socket access to the RMQ container, which is a broad privilege for a chat-message send.
- **Recommendation:** Replace with a proper AMQP client (e.g. `amqplib`) connecting directly to RabbitMQ over a scoped service account and TLS, removing both the Docker-socket dependency and the string-templated Erlang. Lower priority than FINDING-LINK-1 through -3 since no working exploit was found, but should be tracked as technical debt before any additional whisper-based features are added.

### FINDING-LINK-6: No multi-character or multi-account linking exists server-side (Design Gap, not a vulnerability)

- **Location:** `console/api/src/duneDb.js:4669-4713` (schema migration for `dune.discord_player_links` and `dune.discord_pending_links`)
- **Current state:** `discord_player_links` has a unique index on `player_controller_id` (one Discord user per character) **and** the link is upserted keyed by `discord_user_id` alone (`duneDb.js:4762-4767`, `on conflict (discord_user_id) do update`), meaning **one Discord user can only ever have one linked character, globally, at a time.** Re-linking silently overwrites the previous link.
- **Bot-side drift:** `Arrakis-Control-Panel` (bot repo) commit `1ea3316` ("V2 multi-character, multi-guild Discord player linking") added client-side routes/methods (`player-links-start`, `player-links-verify`, `player-links`, `player-links-unlink`, `guild-grants-enable/disable/default`) and local SQLite mirroring, all classified as `UNMERGED_ROUTES` in `src/adapterClient.js` — but **no corresponding schema, provider, or route exists anywhere in this console repo.** These are purely aspirational client scaffolding with no backend. Additionally, conflicting doc revisions in the bot repo (`docs/user-guide.md`, unresolved `<<<<<<< HEAD` markers) claim a Steam-connection auto-link feature that does not exist in this codebase either.
- **Recommendation (if multi-character support is desired):**
  1. Add `dune.discord_account_links` with composite unique `(discord_user_id, account_id)` instead of a single-column unique on `discord_user_id`, keeping `player_controller_id` unique per row (a character still belongs to exactly one Discord user).
  2. Add an `is_default` boolean with a partial unique index enforcing exactly one default per `discord_user_id`.
  3. Key the pending-link table on `(discord_user_id, account_id)` rather than `discord_user_id` alone so concurrent verifications for different accounts don't collide (current schema already uniques `discord_pending_links` by `discord_user_id`, which would need to change too — `duneDb.js:4709-4710`).
  4. Each additional account link still requires its own online-character whisper verification; there is no way to bulk-verify accounts the requester doesn't control, and that constraint should be preserved.
  5. Update the bot's `UNMERGED_ROUTES` classification and stale docs (`docs/user-guide.md` merge conflicts) once real routes exist, and remove the Steam-auto-link documentation claim unless it is actually built.

## STRIDE Notes

| Category | Current Control | Gap |
| --- | --- | --- |
| Spoofing | Single shared bearer token for the whole adapter | No per-actor authentication; `userId`/`roleIds` are unauthenticated claims (LINK-1) |
| Tampering | Strict allowlist regex validation on whisper fields (`rmq.js`) | String-templated Erlang eval remains architecturally fragile (LINK-5) |
| Repudiation | No link/unlink/verify audit event was found in `linkProvider.js` beyond the pending-link/player-link tables themselves | Add structured audit events (actor, action, result, correlation ID) for link/verify/unlink, matching the pattern in the bot's `writes.js::writeAuditEvent()` |
| Information disclosure | Character-name/online-status resolution requires the character to be online | Combined with LINK-1, this becomes an online-status oracle for arbitrary character names |
| Denial of service | 5-minute code expiry limits window | No per-actor rate limit on link attempts or verify attempts (LINK-3) |
| Elevation of privilege | Capability-tier RBAC (`policy.js`) | `moderator` tier is too broad for an identity-binding write (LINK-2); tier itself is only as trustworthy as the unauthenticated `roleIds` claim (LINK-1) |

## Minimal Impact (Proposed)

- No change to the whisper message content or in-game player experience.
- No change to the `/dune data link` / `/dune data verify` / `/dune data unlink` command surface from the operator's perspective — only the trust/authorization internals change.
- FINDING-LINK-2's tier change may require operators who previously granted `moderator` roles expecting link access to explicitly grant `admin` instead; call this out in release notes if implemented.
- FINDING-LINK-6's schema change is additive (new table) and does not require migrating existing single-character links, though a migration path from `discord_player_links` to `discord_account_links` should be written if both are meant to coexist during a transition period.

## Verification (This Branch)

This branch adds documentation only; no source files changed.

- `npm test --prefix console/api`: 518/518 tests pass (unchanged from `main`
  at `e188c87`, confirming no regression from adding this document).

## Proposed Verification Plan

Remediation code not yet implemented on this branch. When work begins:

```bash
npm test --prefix console/api
npm audit --prefix console/api --audit-level=moderate
npm run build --prefix console/web
```

Add targeted tests for:
- Actor payload with mismatched/forged `userId` is rejected once signature/HMAC verification lands (FINDING-LINK-1).
- `moderator`-tier actor is denied `player-link:write` after the tier change (FINDING-LINK-2).
- Repeated failed verification attempts trigger lockout (FINDING-LINK-3).
- `discord_account_links` composite-unique constraint allows two different `account_id`s for the same `discord_user_id`, and rejects a duplicate `(discord_user_id, account_id)` pair (FINDING-LINK-6).

## Sources

- `console/api/src/integrations/discord/policy.js`
- `console/api/src/integrations/discord/linkProvider.js`
- `console/api/src/integrations/discord/routes.js`
- `console/api/src/integrations/discord/adapter.js`
- `console/api/src/rmq.js`
- `console/api/src/carePackage.js`
- `console/api/src/duneDb.js`
- `docs/security/generated-command-auth-token.md`
- `docs/security/login-rate-limit-defense.md`
- `Red-Blink/dune-awakening-selfhost-docker#72` ("[Discussion] RabbitMQ / Command Auth Token", closed 2026-07-17)
- `yacketrj/Arrakis-Control-Panel:docs/security-audit/2026-07-04-comprehensive-security-audit.md`
- `yacketrj/Arrakis-Control-Panel:src/adapterClient.js` (`UNMERGED_ROUTES`)
- `yacketrj/Arrakis-Control-Panel:docs/user-guide.md` (unresolved merge conflicts referencing Steam auto-link)
