// OPS Bridge Providers — maps Discord adapter routes to OPS observability data.
// Each provider returns the data shape expected by the bot's /dune ops-* commands.
//
// Integration: When the OPS observability addon provides a server-side bridge,
// replace each function body with the corresponding bridge action call.
// The addon's bridge actions are defined in yacketrj/dune-ops-observability-addon.

const OPS_BRIDGE_ACTIONS = Object.freeze({
  "ops-activity":   { action: "ops.activity.summary",     desc: "Player activity statistics" },
  "ops-combat":     { action: "ops.combat.deaths",         desc: "Combat and death statistics" },
  "ops-resources":  { action: "ops.resources.summary",     desc: "Resource field statistics" },
  "ops-economy":    { action: "ops.economy.summary",       desc: "Economy statistics" },
  "ops-inventory":  { action: "ops.inventory.summary",     desc: "Inventory and crafting stats" },
  "ops-location":   { action: "ops.location.activity",     desc: "Map location activity" },
  "ops-soc":        { action: "ops.soc.summary",           desc: "OPS bridge health and stats" },
  "ops-prometheus": { action: "ops.health.prometheus",     desc: "Container and infra metrics" },
  "ops-dashboard":  { action: "ops.aggregated.dashboard",  desc: "Aggregated dashboard summary" },
});

export function opsBridgeActionFor(routeKey) {
  return OPS_BRIDGE_ACTIONS[routeKey]?.action || null;
}

export function opsBridgeDescription(routeKey) {
  return OPS_BRIDGE_ACTIONS[routeKey]?.desc || "OPS observability data";
}

// Provider functions — each maps to a Discord adapter OPS route.
// TODO: Wire to server-side bridge actions when available from the addon.

export async function opsActivityProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.activity.summary");
  return opsPlaceholder("activity");
}

export async function opsCombatProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.combat.deaths");
  return opsPlaceholder("combat");
}

export async function opsResourcesProvider(config, db) {
  try {
    if (!db || typeof db.query !== "function") {
      throw new Error("Database not available");
    }
    const result = await db.query(`
      select map_name,
             field_type,
             current_globally_active,
             max_globally_active
      from dune.spicefield_types
      order by map_name, field_type
    `);
    const rows = result.rows || [];

    const sizeSortOrder = { Small: 1, Medium: 2, Large: 3 };

    const spiceFieldsBySizeMap = new Map();
    for (const row of rows) {
      const key = `${row.map_name}::${row.field_type}`;
      if (!spiceFieldsBySizeMap.has(key)) {
        spiceFieldsBySizeMap.set(key, {
          size: row.field_type,
          map: row.map_name,
          active_fields: 0,
          total_value: 0,
          currently_active: row.current_globally_active ?? 0,
          max_active: row.max_globally_active ?? 0,
        });
      }
      spiceFieldsBySizeMap.get(key).active_fields += 1;
    }
    const spiceFieldsBySize = [...spiceFieldsBySizeMap.values()].sort((a, b) => {
      if (a.map !== b.map) return a.map.localeCompare(b.map);
      return (sizeSortOrder[a.size] ?? 99) - (sizeSortOrder[b.size] ?? 99);
    });

    const typeMap = new Map();
    for (const row of rows) {
      const type = row.field_type;
      if (!typeMap.has(type)) typeMap.set(type, { type, fields: 0, totalValue: 0 });
      typeMap.get(type).fields += 1;
    }
    const resourcesByType = [...typeMap.values()].sort(
      (a, b) => (sizeSortOrder[a.type] ?? 99) - (sizeSortOrder[b.type] ?? 99)
    );

    const mapMap = new Map();
    for (const row of rows) {
      const map = row.map_name;
      if (!mapMap.has(map)) mapMap.set(map, { map, fields: 0, totalValue: 0 });
      mapMap.get(map).fields += 1;
    }
    const resourcesByMap = [...mapMap.values()].sort((a, b) => a.map.localeCompare(b.map));

    return {
      ok: true,
      totalFields: rows.length,
      totalValueRemaining: 0,
      spiceFieldsBySize,
      resourcesByType,
      resourcesByMap,
    };
  } catch (error) {
    return opsPlaceholder("resources");
  }
}

export async function opsEconomyProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.economy.summary");
  return opsPlaceholder("economy");
}

export async function opsInventoryProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.inventory.summary");
  return opsPlaceholder("inventory");
}

export async function opsLocationProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.location.activity");
  return opsPlaceholder("location");
}

export async function opsSocProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.soc.summary");
  return opsPlaceholder("soc");
}

export async function opsPrometheusProvider(config) {
  // TODO: return await opsBridgeRequest(config, "ops.health.prometheus");
  return opsPlaceholder("prometheus");
}

export async function opsDashboardProvider(config, db) {
  // Aggregate from all other providers
  const results = await Promise.allSettled([
    opsActivityProvider(config, db), opsCombatProvider(config, db),
    opsResourcesProvider(config, db), opsEconomyProvider(config, db),
    opsInventoryProvider(config, db), opsLocationProvider(config, db),
    opsSocProvider(config, db), opsPrometheusProvider(config, db),
  ]);
  const data = {};
  results.forEach((r, i) => {
    const keys = ["activity","combat","resources","economy","inventory","location","soc","prometheus"];
    data[keys[i]] = r.status === "fulfilled" ? r.value : { error: r.reason?.message || "failed" };
  });
  return { ok: true, dashboard: data };
}

function opsPlaceholder(domain) {
  return {
    ok: true,
    status: "planned",
    domain,
    message: `OPS ${domain} bridge integration pending. See yacketrj/dune-ops-observability-addon.`,
    summary: {}
  };
}

// Template for server-side bridge implementation:
// async function opsBridgeRequest(config, action, payload = {}) {
//   // TODO: Call the console's internal ops bridge handler.
//   // Example: const result = await internalOpsBridge.getAction(action, payload);
//   //   return { ok: true, result };
// }
