const statusEl = document.querySelector("#status");
const outputEl = document.querySelector("#output");
const buttonEl = document.querySelector("#refresh-players");
const playersBodyEl = document.querySelector("#players-body");
const providerLabelEl = document.querySelector("#provider-label");
const emptyStateEl = document.querySelector("#empty-state");
const metricTotalEl = document.querySelector("#metric-total");
const metricOnlineEl = document.querySelector("#metric-online");
const metricOfflineEl = document.querySelector("#metric-offline");
const metricFactionsEl = document.querySelector("#metric-factions");
const opsSourceHealthEl = document.querySelector("#ops-source-health");
const opsSourceHealthNoteEl = document.querySelector("#ops-source-health-note");
const opsFreshnessEl = document.querySelector("#ops-freshness");
const opsFreshnessNoteEl = document.querySelector("#ops-freshness-note");
const opsPlayerImpactEl = document.querySelector("#ops-player-impact");
const opsPlayerImpactNoteEl = document.querySelector("#ops-player-impact-note");
const opsOperatorStatusEl = document.querySelector("#ops-operator-status");
const opsOperatorStatusNoteEl = document.querySelector("#ops-operator-status-note");
const kpiActiveRateEl = document.querySelector("#kpi-active-rate");
const kpiActiveRateNoteEl = document.querySelector("#kpi-active-rate-note");
const kpiAverageLevelEl = document.querySelector("#kpi-average-level");
const kpiAverageLevelNoteEl = document.querySelector("#kpi-average-level-note");
const kpiTopFactionEl = document.querySelector("#kpi-top-faction");
const kpiTopFactionNoteEl = document.querySelector("#kpi-top-faction-note");
const kpiTopGuildEl = document.querySelector("#kpi-top-guild");
const kpiTopGuildNoteEl = document.querySelector("#kpi-top-guild-note");

const STALE_READ_THRESHOLD_MS = 5 * 60 * 1000;
let lastSuccessfulReadAt = null;
let previousTotals = null;

function writeStatus(text, className) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = className || "";
}

function writeOutput(value) {
  if (!outputEl) return;
  outputEl.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function setText(element, value) {
  if (!element) return;
  element.textContent = String(value);
}

function getProvider() {
  if (!window.DuneOpsProviders) {
    throw new Error("Addon data providers failed to load.");
  }
  return window.DuneOpsProviders.currentProvider();
}

function readField(player, names, fallback) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(player, name) && player[name] !== null && player[name] !== undefined && player[name] !== "") {
      return player[name];
    }
  }
  return fallback;
}

function normalizePlayer(player) {
  return {
    name: readField(player, ["name", "playerName", "username", "displayName"], "Unknown player"),
    level: readField(player, ["level", "playerLevel"], "—"),
    faction: readField(player, ["faction", "house", "allegiance"], "Unknown"),
    guild: readField(player, ["guild", "guildName", "company", "clan"], "—"),
    status: readField(player, ["status", "onlineStatus", "state"], "Unknown"),
    location: readField(player, ["map", "location", "zone", "server", "serviceLocation"], "—"),
    lastSeen: readField(player, ["lastSeen", "last_seen", "lastOnline", "updatedAt"], "—")
  };
}

function clearTable() {
  if (!playersBodyEl) return;
  while (playersBodyEl.firstChild) {
    playersBodyEl.removeChild(playersBodyEl.firstChild);
  }
}

function appendCell(row, value, className) {
  const cell = document.createElement("td");
  cell.textContent = String(value);
  if (className) cell.className = className;
  row.appendChild(cell);
}

function statusClass(status) {
  return String(status).toLowerCase() === "online" ? "pill pill-online" : "pill";
}

function formatRefreshTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatAge(milliseconds) {
  if (milliseconds < 1000) return "now";
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function playerDeltaLabel(current, previous) {
  if (!previous) return "Baseline";
  const totalDelta = current.total - previous.total;
  const onlineDelta = current.online - previous.online;
  const signedTotal = totalDelta > 0 ? `+${totalDelta}` : String(totalDelta);
  const signedOnline = onlineDelta > 0 ? `+${onlineDelta}` : String(onlineDelta);

  if (totalDelta === 0 && onlineDelta === 0) return "No change";
  return `${signedTotal} total / ${signedOnline} online`;
}

function updateOpsHealth(provider, totals, refreshedAt, error) {
  const isBridge = provider && provider.name === "bridge";
  const now = refreshedAt || new Date();
  const lastAge = lastSuccessfulReadAt ? now.getTime() - lastSuccessfulReadAt.getTime() : null;
  const isStale = lastAge !== null && lastAge > STALE_READ_THRESHOLD_MS;
  const sourceHealth = error ? "Degraded" : isBridge ? "Bridge live" : "Preview";
  const sourceNote = error
    ? "The active provider returned an error."
    : isBridge
      ? "Reading through the Dune Docker Console bridge."
      : "Using sample data because the addon is not inside the Console iframe.";
  const freshness = error
    ? lastSuccessfulReadAt ? "Stale" : "No read"
    : isStale ? "Stale" : "Fresh";
  const freshnessNote = lastSuccessfulReadAt
    ? `Last successful read: ${formatRefreshTime(lastSuccessfulReadAt)} (${formatAge(lastAge || 0)}).`
    : "No successful read has completed in this session.";
  const impactLabel = totals ? playerDeltaLabel(totals, previousTotals) : "Unavailable";
  const impactNote = totals
    ? previousTotals
      ? `Current rows: ${totals.total}; online: ${totals.online}; previous rows: ${previousTotals.total}; previous online: ${previousTotals.online}.`
      : `Baseline established with ${totals.total} player rows and ${totals.online} online.`
    : "No player summary is available for comparison.";
  const operatorStatus = error
    ? "Action needed"
    : isBridge && !isStale
      ? "Healthy"
      : isBridge && isStale
        ? "Stale"
        : "Preview";
  const operatorNote = error
    ? "Provider read failed. Confirm the Console bridge and permissions."
    : isBridge
      ? "Bridge read completed within the approved player-read boundary."
      : "Open through Dune Docker Console Addons to validate live bridge data.";

  setText(opsSourceHealthEl, sourceHealth);
  setText(opsSourceHealthNoteEl, sourceNote);
  setText(opsFreshnessEl, freshness);
  setText(opsFreshnessNoteEl, freshnessNote);
  setText(opsPlayerImpactEl, impactLabel);
  setText(opsPlayerImpactNoteEl, impactNote);
  setText(opsOperatorStatusEl, operatorStatus);
  setText(opsOperatorStatusNoteEl, operatorNote);

  return {
    sourceHealth,
    freshness,
    playerImpact: impactLabel,
    operatorStatus,
    lastSuccessfulRead: lastSuccessfulReadAt ? lastSuccessfulReadAt.toISOString() : null,
    staleThresholdSeconds: STALE_READ_THRESHOLD_MS / 1000
  };
}

function countBy(players, fieldName, ignoredValue) {
  const counts = new Map();
  for (const player of players) {
    const value = player[fieldName];
    if (!value || value === ignoredValue) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function topCountLabel(counts) {
  let topName = "—";
  let topCount = 0;
  for (const [name, count] of counts.entries()) {
    if (count > topCount) {
      topName = name;
      topCount = count;
    }
  }
  return { name: topName, count: topCount };
}

function renderKpis(players, totals) {
  const activeRate = totals.total > 0 ? Math.round((totals.online / totals.total) * 100) : null;
  const numericLevels = players.map((player) => Number(player.level)).filter((level) => Number.isFinite(level));
  const averageLevel = numericLevels.length > 0
    ? Math.round(numericLevels.reduce((sum, level) => sum + level, 0) / numericLevels.length)
    : null;
  const topFaction = topCountLabel(countBy(players, "faction", "Unknown"));
  const topGuild = topCountLabel(countBy(players, "guild", "—"));

  setText(kpiActiveRateEl, activeRate === null ? "—" : `${activeRate}%`);
  setText(kpiActiveRateNoteEl, totals.total > 0 ? `${totals.online} of ${totals.total} players are online.` : "No player rows available.");
  setText(kpiAverageLevelEl, averageLevel === null ? "—" : averageLevel);
  setText(kpiAverageLevelNoteEl, numericLevels.length > 0 ? `Based on ${numericLevels.length} level values.` : "No numeric level values available.");
  setText(kpiTopFactionEl, topFaction.name);
  setText(kpiTopFactionNoteEl, topFaction.count > 0 ? `${topFaction.count} players in this faction.` : "No faction values available.");
  setText(kpiTopGuildEl, topGuild.name);
  setText(kpiTopGuildNoteEl, topGuild.count > 0 ? `${topGuild.count} players in this guild.` : "No guild values available.");

  return {
    activeRate,
    averageLevel,
    topFaction: topFaction.name,
    topGuild: topGuild.name
  };
}

function renderPlayers(players) {
  const normalized = players.map(normalizePlayer);
  clearTable();

  const onlineCount = normalized.filter((player) => String(player.status).toLowerCase() === "online").length;
  const offlineCount = normalized.length - onlineCount;
  const factionCount = new Set(normalized.map((player) => player.faction).filter((faction) => faction && faction !== "Unknown")).size;
  const totals = { total: normalized.length, online: onlineCount, offline: offlineCount, factions: factionCount };

  setText(metricTotalEl, normalized.length);
  setText(metricOnlineEl, onlineCount);
  setText(metricOfflineEl, offlineCount);
  setText(metricFactionsEl, factionCount);

  if (emptyStateEl) {
    emptyStateEl.hidden = normalized.length > 0;
  }

  for (const player of normalized) {
    const row = document.createElement("tr");
    appendCell(row, player.name);
    appendCell(row, player.level);
    appendCell(row, player.faction);
    appendCell(row, player.guild);
    appendCell(row, player.status, statusClass(player.status));
    appendCell(row, player.location);
    appendCell(row, player.lastSeen);
    playersBodyEl.appendChild(row);
  }

  return { totals, kpis: renderKpis(normalized, totals) };
}

async function refreshPlayerSummary() {
  let provider;

  try {
    provider = getProvider();
    if (providerLabelEl) providerLabelEl.textContent = `Provider: ${provider.label}`;

    const players = await provider.listPlayers();
    const playerList = Array.isArray(players) ? players : [];
    const summary = renderPlayers(playerList);
    const refreshedAt = new Date();
    const previousSnapshot = previousTotals;
    lastSuccessfulReadAt = refreshedAt;
    const opsHealth = updateOpsHealth(provider, summary.totals, refreshedAt, null);

    if (provider.name === "bridge") {
      writeStatus("Connected to Dune Docker Console. Showing live bridge data.", "status-ok");
    } else {
      writeStatus("Preview mode. Showing sample data because the addon is not running inside the Console iframe.", "status-info");
    }

    writeOutput({
      provider: provider.name,
      sourceMode: provider.name === "bridge" ? "live-bridge" : "preview-sample",
      lastRefresh: refreshedAt.toISOString(),
      rowsReturned: playerList.length,
      totals: summary.totals,
      previousTotals: previousSnapshot,
      opsHealth,
      kpis: summary.kpis
    });

    previousTotals = summary.totals;
  } catch (error) {
    const refreshedAt = new Date();
    renderPlayers([]);
    const opsHealth = updateOpsHealth(provider, null, refreshedAt, error);
    writeStatus("Unable to read player summary from the configured data provider.", "status-warn");
    writeOutput({
      provider: provider ? provider.name : "unknown",
      sourceMode: provider && provider.name === "bridge" ? "live-bridge" : "unknown",
      lastRefresh: refreshedAt.toISOString(),
      opsHealth,
      error: error.message || String(error)
    });
  }
}

writeStatus(
  window.parent === window
    ? "Preview mode. This is expected when opened directly; sample data is available for layout testing."
    : "Console iframe mode. Ready to read player summary from the bridge.",
  window.parent === window ? "status-info" : "status-ok"
);

if (buttonEl) buttonEl.addEventListener("click", refreshPlayerSummary);
refreshPlayerSummary();
