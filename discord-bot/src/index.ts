import { loadConfig, validateConfig } from "./config.js";
import { redactValue, safeErrorMessage } from "./security/redaction.js";

async function main(): Promise<void> {
  const config = loadConfig();
  validateConfig(config);

  // The Discord client is intentionally not initialized yet.
  // P0 work establishes secure config, redaction, authorization, and CI gates first.
  console.log(JSON.stringify({
    service: "dune-discord-control-bot",
    status: "security-scaffold-ready",
    config: redactValue({
      duneConsoleApiUrl: config.duneConsoleApiUrl,
      discordGuildId: config.discordGuildId,
      discordBotTokenFile: config.discordBotTokenFile,
      duneBotApiTokenFile: config.duneBotApiTokenFile,
      writesEnabled: config.discordWritesEnabled
    })
  }));
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    service: "dune-discord-control-bot",
    status: "fatal",
    error: safeErrorMessage(error)
  }));
  process.exitCode = 1;
});
