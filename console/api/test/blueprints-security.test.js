import test from "node:test";
import assert from "node:assert/strict";
import { importBlueprint, deleteBlueprint, listBlueprints, exportBlueprint } from "../src/blueprints.js";

// ── XSS / injection in names ──

function dbWithNameCheck() {
  const names = new Map();
  const db = {
    query: async (text, values) => {
      if (text.includes("to_regclass")) return { rows: [{ exists: true }] };
      if (text.includes("online_status") && text.includes("player_state")) return { rows: [{ status: "Offline" }] };
      if (text.includes("actor_id = $1 and inventory_type = 0")) return { rows: [{ id: 10, max_item_count: 40, max_item_volume: 225 }] };
      if (text.includes("count(*)") && text.includes("from dune.items where inventory_id")) return { rows: [{ cnt: 0 }] };
      if (text.includes("max(position_index)")) return { rows: [{ next_pos: 0 }] };
      if (text.includes("insert into dune.items") && text.includes("BuildingBlueprint_CopyDevice")) {
        const stats = JSON.parse(values[2]);
        const name = stats.FBuildingBlueprintItemStats?.[1]?.BuildingBlueprintName || "";
        names.set(1, name);
        return { rows: [{ id: 900 }] };
      }
      if (text.includes("insert into dune.building_blueprints")) return { rows: [{ id: 200 }] };
      if (text.includes("update dune.items set stats")) {
        const stats = JSON.parse(values[0]);
        const name = stats.FBuildingBlueprintItemStats?.[1]?.BuildingBlueprintName || "";
        names.set(2, name);
        return { rows: [] };
      }
      if (text.includes("insert into dune.building_blueprint_instances")) return { rows: [] };
      if (text.includes("insert into dune.building_blueprint_placeables")) return { rows: [] };
      if (text.includes("insert into dune.building_blueprint_pentashields")) return { rows: [] };
      if (text.includes("FBuildingBlueprintItemStats") && text.includes("bb.player_id")) {
        const nameVal = values[1];
        const exists = Array.from(names.values()).some(n => n === nameVal);
        return { rows: exists ? [{ "1": 1 }] : [] };
      }
      if (text.includes("FBuildingBlueprintItemStats") && text.includes("where bb.id")) return { rows: [{ name: names.get(2) || "" }] };
      if (text.includes("from dune.building_blueprint_instances") && text.includes("where building_blueprint_id")) return { rows: [] };
      if (text.includes("from dune.building_blueprint_placeables") && text.includes("where building_blueprint_id")) return { rows: [] };
      if (text.includes("from dune.building_blueprint_pentashields") && text.includes("where building_blueprint_id")) return { rows: [] };
      if (text.includes("order by bb.id desc")) return { rows: [] };
      return { rows: [] };
    },
    transaction: async (fn) => fn(db)
  };
  return db;
}

const MIN_INSTANCE = { building_type: "Test_Wall", x: 0, y: 0, z: 0, rotation: 0 };

test("importBlueprint strips HTML tags from name", async () => {
  const db = dbWithNameCheck();
  const result = await importBlueprint(db, 123, { name: "<script>alert(1)</script>", instances: [MIN_INSTANCE] });
  assert.ok(result.ok);
});

test("importBlueprint name does not contain SQL injection patterns", async () => {
  const db = dbWithNameCheck();
  await assert.doesNotReject(async () => {
    await importBlueprint(db, 123, { name: "Base'; DROP TABLE items;--", instances: [MIN_INSTANCE] });
  });
});

test("importBlueprint handles extremely long names without crash", async () => {
  const db = dbWithNameCheck();
  const longName = "A".repeat(10000);
  await assert.doesNotReject(async () => {
    await importBlueprint(db, 123, { name: longName, instances: [MIN_INSTANCE] });
  });
});

test("importBlueprint handles newlines in name", async () => {
  const db = dbWithNameCheck();
  const result = await importBlueprint(db, 123, { name: "Line\nBreak\rTab\t", instances: [MIN_INSTANCE] });
  assert.ok(result.ok);
});

test("importBlueprint handles null bytes in name without crash", async () => {
  const db = dbWithNameCheck();
  await assert.doesNotReject(async () => {
    await importBlueprint(db, 123, { name: "Base\u0000Hidden", instances: [MIN_INSTANCE] });
  });
});

test("importBlueprint handles Unicode in names", async () => {
  const db = dbWithNameCheck();
  const result = await importBlueprint(db, 123, { name: "基地 аррlе смелые ⚡", instances: [MIN_INSTANCE] });
  assert.ok(result.ok);
});

test("importBlueprint rejects overly large instance arrays", async () => {
  const db = dbWithNameCheck();
  const many = Array.from({ length: 10000 }, (_, i) => ({
    building_type: "MTX_Smug_Foundation",
    x: i * 10, y: 0, z: 0, rotation: 0
  }));
  await assert.doesNotReject(async () => {
    await importBlueprint(db, 123, { instances: many });
  });
});

test("importBlueprint handles deeply nested JSON objects", async () => {
  const db = dbWithNameCheck();
  const deep = { name: "Deep", instances: [{
    building_type: "Test",
    x: 0, y: 0, z: 0, rotation: 0,
    extra: { nested: { deeply: { foo: "bar" } } }
  }] };
  await assert.doesNotReject(async () => {
    await importBlueprint(db, 123, deep);
  });
});

test("importBlueprint rejects negative instance counts gracefully", async () => {
  const db = dbWithNameCheck([]);
  await assert.rejects(
    () => importBlueprint(db, 123, { instances: -1 }),
    /must be an object with instances/i
  );
});

test("importBlueprint handles player_id as string numeric", async () => {
  const db = dbWithNameCheck();
  const result = await importBlueprint(db, "456", { instances: [MIN_INSTANCE] });
  assert.ok(result.ok);
});

test("importBlueprint handles player_id as zero or negative", async () => {
  const db = {
    query: async (text) => {
      if (text.includes("to_regclass")) return { rows: [{ exists: true }] };
      if (text.includes("online_status") && text.includes("player_state")) return { rows: [] };
      return { rows: [] };
    },
    transaction: async (fn) => fn(db)
  };
  await assert.rejects(
    () => importBlueprint(db, 0, { instances: [] }),
    /not found/i
  );
});

test("deleteBlueprint handles string ID gracefully", async () => {
  const db = {
    query: async (text) => {
      if (text.includes("to_regclass")) return { rows: [{ exists: true }] };
      if (text.includes("select item_id from dune.building_blueprints")) return { rows: [{ item_id: 500 }] };
      if (text.includes("delete from")) return { rows: [] };
      return { rows: [] };
    },
    transaction: async (fn) => fn(db)
  };
  const result = await deleteBlueprint(db, "101");
  assert.ok(result.ok);
});

test("importBlueprint resists prototype pollution via name", async () => {
  const db = dbWithNameCheck();
  const result = await importBlueprint(db, 123, {
    name: "__proto__",
    instances: [MIN_INSTANCE]
  });
  assert.ok(result.ok);
  assert.notStrictEqual(result.blueprintName, {});
});
