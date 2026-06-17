import assert from "node:assert/strict";
import test from "node:test";
import { DISCORD_CAPABILITIES, discordActorCan, discordActorTier, normalizeDiscordActor, requireDiscordCapability } from "../src/integrations/discord/policy.js";

const mapping = {
  observerRoleIds: ["role-observer"],
  moderatorRoleIds: ["role-moderator"],
  adminRoleIds: ["role-admin"],
  ownerRoleIds: ["role-owner"]
};

function actor(roleIds = []) {
  return normalizeDiscordActor({
    guildId: "guild-1",
    channelId: "channel-1",
    userId: "user-1",
    username: "tester",
    roleIds,
    interactionId: "interaction-1",
    commandName: "/dune test"
  });
}

test("normalizes required Discord actor context", () => {
  const result = actor(["role-admin"]);
  assert.equal(result.guildId, "guild-1");
  assert.equal(result.userId, "user-1");
  assert.deepEqual(result.roleIds, ["role-admin"]);
});

test("rejects missing Discord actor context", () => {
  assert.throws(() => normalizeDiscordActor(null), /Discord actor context is required/);
});

test("maps owner above admin above moderator above observer", () => {
  assert.equal(discordActorTier(actor(["role-owner", "role-admin"]), mapping), "owner");
  assert.equal(discordActorTier(actor(["role-admin", "role-moderator"]), mapping), "admin");
  assert.equal(discordActorTier(actor(["role-moderator", "role-observer"]), mapping), "moderator");
  assert.equal(discordActorTier(actor(["role-observer"]), mapping), "observer");
  assert.equal(discordActorTier(actor([]), mapping), "public");
});

test("allows public actors to read status only", () => {
  assert.equal(discordActorCan(actor([]), mapping, DISCORD_CAPABILITIES.STATUS_READ), true);
  assert.equal(discordActorCan(actor([]), mapping, DISCORD_CAPABILITIES.PLAYERS_READ), false);
});

test("blocks admin from owner-only destructive capability", () => {
  assert.equal(discordActorCan(actor(["role-admin"]), mapping, DISCORD_CAPABILITIES.BACKUPS_DESTRUCTIVE), false);
  assert.throws(() => requireDiscordCapability(actor(["role-admin"]), mapping, DISCORD_CAPABILITIES.BACKUPS_DESTRUCTIVE), /not authorized/);
});

test("allows owner all capabilities", () => {
  for (const capability of Object.values(DISCORD_CAPABILITIES)) {
    assert.equal(discordActorCan(actor(["role-owner"]), mapping, capability), true, capability);
  }
});
