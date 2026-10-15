import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { CardCompact, type CardCreateInput } from "@metabase/client/domain/card";
import {
  PermissionsGraph,
  PermissionsGraphRevision,
  type PermissionsGraphUpdateInput,
} from "@metabase/client/domain/permission";
import { parseJson } from "@metabase/client/json";

import { SandboxListEnvelope } from "../../packages/cli/src/commands/sandbox/list";
import { readBootstrap, type E2EBootstrap } from "./bootstrap-data";
import { cleanupConfigHome, mkTempConfigHome, runCli } from "./run-cli";
import { E2E_GROUPS } from "./seed/ids";
import { SEEDED } from "./seed/seeded";
import { requireServer } from "./server-gate";

const skipReason = requireServer("sandbox › sandbox e2e against EE row and column security", [
  "rowSecurity",
]);

const DB = String(SEEDED.warehouseDbId);
const ORDERS = String(SEEDED.tables.orders);
const ALL_USERS = String(E2E_GROUPS.ALL_USERS);

// Every column of `orders`, as a policy question must return, narrowed to one customer by an
// optional variable so the question also runs, and saves its columns, without a value.
const ORDERS_BY_CUSTOMER: CardCreateInput = {
  name: "e2e sandbox: orders by customer",
  display: "table",
  visualization_settings: {},
  collection_id: SEEDED.defaultCollectionId,
  dataset_query: {
    type: "native",
    database: SEEDED.warehouseDbId,
    native: {
      query: "SELECT * FROM orders [[WHERE customer_id = {{customer_id}}]]",
      "template-tags": {
        customer_id: {
          id: "6f1c2a52-3c1e-4a8e-9a39-2d6a3b4c5d6e",
          name: "customer_id",
          "display-name": "Customer ID",
          type: "number",
        },
      },
    },
  },
};

const CUSTOMER_REMAPPING = { customer_id: ["variable", ["template-tag", "customer_id"]] };

describe.skipIf(skipReason !== null)("sandbox e2e", () => {
  let bootstrap: E2EBootstrap;
  const tempDirs: string[] = [];

  beforeAll(async () => {
    bootstrap = await readBootstrap();
  });

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map(cleanupConfigHome));
  });

  async function makeIsolatedConfigHome(): Promise<string> {
    const dir = await mkTempConfigHome();
    tempDirs.push(dir);
    return dir;
  }

  function authEnv(): Record<string, string> {
    return {
      MB_URL: bootstrap.baseUrl,
      MB_API_KEY: bootstrap.adminApiKey,
    };
  }

  async function listPolicies() {
    const result = await runCli({
      args: ["sandbox", "list", "--json", "--max-bytes", "0"],
      configHome: await makeIsolatedConfigHome(),
      env: authEnv(),
    });
    expect(result.exitCode, result.stderr).toBe(0);
    return parseJson(result.stdout, SandboxListEnvelope).data;
  }

  it("lists no policies on the seeded instance", async () => {
    expect(await listPolicies()).toEqual([]);
  });

  it("a policy sent with update-graph is listed by sandbox list", async () => {
    const card = await runCli({
      args: ["card", "create", "--json"],
      stdin: JSON.stringify(ORDERS_BY_CUSTOMER),
      configHome: await makeIsolatedConfigHome(),
      env: authEnv(),
    });
    expect(card.exitCode, card.stderr).toBe(0);
    const cardId = parseJson(card.stdout, CardCompact).id;

    const graph = await runCli({
      args: ["permission", "graph", "--db", DB, "--json"],
      configHome: await makeIsolatedConfigHome(),
      env: authEnv(),
    });
    expect(graph.exitCode, graph.stderr).toBe(0);
    const { revision } = parseJson(graph.stdout, PermissionsGraph);
    const body: PermissionsGraphUpdateInput = {
      revision,
      groups: {
        [ALL_USERS]: {
          [DB]: {
            "view-data": { public: { [ORDERS]: "sandboxed" } },
            "create-queries": { public: { [ORDERS]: "query-builder" } },
          },
        },
      },
      sandboxes: [
        {
          group_id: E2E_GROUPS.ALL_USERS,
          table_id: SEEDED.tables.orders,
          card_id: cardId,
          attribute_remappings: CUSTOMER_REMAPPING,
        },
      ],
    };

    const update = await runCli({
      args: ["permission", "update-graph", "--body", JSON.stringify(body), "--json"],
      configHome: await makeIsolatedConfigHome(),
      env: authEnv(),
    });

    expect(update.exitCode, update.stderr).toBe(0);
    expect(parseJson(update.stdout, PermissionsGraphRevision).revision).toBeGreaterThan(revision);
    const policies = await listPolicies();
    expect(policies).toEqual([
      {
        id: policies[0]?.id,
        group_id: E2E_GROUPS.ALL_USERS,
        table_id: SEEDED.tables.orders,
        card_id: cardId,
        attribute_remappings: CUSTOMER_REMAPPING,
      },
    ]);
  });
});
