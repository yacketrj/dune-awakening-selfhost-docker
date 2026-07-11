import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  playerInventory,
  playerOwnedStorageQuery,
  guildStorageQuery,
  searchItemsInContainers,
  searchItemsInPlayerInventory
} from "../../duneDb.js";

let _itemCatalog = null;

function loadItemCatalog(config) {
  if (_itemCatalog) return _itemCatalog;
  try {
    const catalogPath = resolve(config.repoRoot || process.env.DUNE_DOCKER_DIR || process.cwd(), "runtime/data/admin-items.json");
    const raw = readFileSync(catalogPath, "utf8");
    const items = JSON.parse(raw);
    _itemCatalog = new Map(items.map((item) => [item.id, item.name]));
  } catch {
    _itemCatalog = new Map();
  }
  return _itemCatalog;
}

function enrichItem(item, catalog) {
  const name = catalog.get(item.template_id) || catalog.get(item.templateId) || null;
  if (name) item.displayName = name;
  return item;
}

export function groupByMap(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.template_id || item.templateId || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        template_id: key,
        total_count: 0,
        items: []
      });
    }
    const entry = map.get(key);
    entry.total_count += Number(item.stack_size || item.quantity || 1);
    entry.items.push(item);
  }
  return Array.from(map.values());
}

export function groupByContainer(items, containerField = "container_id") {
  const map = new Map();
  for (const item of items) {
    const key = item[containerField] || "unknown";
    if (!map.has(key)) {
      map.set(key, {
        container_id: key,
        container_name: item.container_name || item.name || "",
        item_count: 0,
        items: []
      });
    }
    const entry = map.get(key);
    entry.item_count += 1;
    entry.items.push(item);
  }
  return Array.from(map.values());
}

export async function playerInventoryProvider(config, db, { playerPawnId, characterName } = {}) {
  const catalog = loadItemCatalog(config);
  const result = await playerInventory(db, playerPawnId);
  const rows = (result.rows || []).map((item) => enrichItem(item, catalog));
  return {
    ok: true,
    characterName: characterName || `Player ${playerPawnId}`,
    capabilities: result.capabilities || {},
    grouped: groupByMap(rows),
    rows,
    count: rows.length
  };
}

export async function playerStorageProvider(db, { playerControllerId, scope = "owned" }) {
  if (scope === "owned") {
    const result = await playerOwnedStorageQuery(db, playerControllerId);
    const rows = result.rows || [];
    return {
      ok: true,
      scope: "owned",
      grouped: groupByContainer(rows, "id"),
      rows,
      count: rows.length
    };
  }
  if (scope === "guild") {
    const result = await guildStorageQuery(db, playerControllerId);
    const rows = result.rows || [];
    return {
      ok: true,
      scope: "guild",
      grouped: groupByContainer(rows, "id"),
      rows,
      count: rows.length
    };
  }
  throw new Error(`Unsupported storage scope: ${scope}. Use "owned" or "guild".`);
}

export async function itemSearchProvider(db, { playerControllerId, query, scope = "owned" }) {
  if (!query || !String(query).trim()) {
    throw new Error("Search query is required.");
  }
  const result = await searchItemsInContainers(db, {
    playerControllerId,
    query: String(query).trim(),
    scope
  });
  const rows = result.rows || [];
  return {
    ok: true,
    scope,
    query,
    grouped: groupByMap(rows),
    rows,
    count: rows.length
  };
}

export async function inventorySearchProvider(config, db, { playerPawnId, query }) {
  const catalog = loadItemCatalog(config);
  if (!query || !String(query).trim()) {
    throw new Error("Search query is required.");
  }
  const result = await searchItemsInPlayerInventory(db, playerPawnId, String(query).trim());
  const rows = (result.rows || []).map((item) => enrichItem(item, catalog));
  return {
    ok: true,
    query,
    grouped: groupByMap(rows),
    rows,
    count: rows.length
  };
}
