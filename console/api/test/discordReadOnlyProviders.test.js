import assert from "node:assert/strict";
import test from "node:test";
import { parseReadinessOutput, parseServicesOutput } from "../src/integrations/discord/readOnlyProviders.js";

test("parses readiness output without exposing raw ports", () => {
  const result = parseReadinessOutput(`CHECK                    PORT     STATUS
Postgres localhost       15432/tcp OK
Survival_1 clients       7778/udp MISSING
Overmap S2S              7889/udp OK`, 1);

  assert.equal(result.ready, false);
  assert.equal(result.overall, "ISSUE");
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /MISSING/);
  assert.doesNotMatch(result.issues[0], /7778\/udp/);
});

test("parses services output into friendly service names", () => {
  const result = parseServicesOutput(`SERVICE                    STATUS
dune-postgres              Up 2 minutes
dune-rmq-admin             Up 2 minutes
dune-server-gateway        missing
dune-server-overmap        Up 48 seconds`);

  assert.equal(result.overall, "ISSUE");
  assert.deepEqual(result.services, [
    { name: "Database", status: "up" },
    { name: "RabbitMQ Admin", status: "up" },
    { name: "Gateway", status: "missing" },
    { name: "Overmap", status: "up" }
  ]);
  assert.deepEqual(result.issues, ["Gateway is missing"]);
});
