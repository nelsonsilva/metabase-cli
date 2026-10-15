import { assert, describe, expect, it } from "vitest";

import { createClient } from "../client";
import type { ClientCredentials } from "../http/transport";
import {
  captureFetch,
  jsonResponse,
  premiumRefusalResponse,
  probeResponse,
  TEST_USER_AGENT,
  thrownBy,
} from "../testing/fetch-capture";
import { CapabilityError } from "../version/capability-error";
import { createServerProfile } from "../version/profile";

const CREDENTIALS: ClientCredentials = {
  url: "https://mb.example.com/metabase",
  credential: { kind: "apiKey", apiKey: "mb_wire_test_key" },
};

const JSON_READ_HEADERS = {
  accept: "application/json",
  "user-agent": TEST_USER_AGENT,
  "x-api-key": "mb_wire_test_key",
};

const POLICY = {
  id: 3,
  group_id: 5,
  table_id: 11,
  card_id: 100,
  attribute_remappings: { enterprise_id: ["variable", ["template-tag", "enterprise_id"]] },
  permission_id: null,
};

// The least server that answers this resource; the unlicensed profile flips its one token key.
const LICENSED = createServerProfile({
  edition: "ee",
  version: { kind: "release", tag: "v1.58.0", major: 58, patch: 0 },
  date: null,
  hash: null,
  tokenFeatures: { sandboxes: true },
});

const UNLICENSED = createServerProfile({
  edition: "ee",
  version: { kind: "release", tag: "v1.58.0", major: 58, patch: 0 },
  date: null,
  hash: null,
  tokenFeatures: { sandboxes: false },
});

function clientOver(responses: Array<Response>, server = LICENSED) {
  const capture = captureFetch(responses);
  const mb = createClient(CREDENTIALS, {
    userAgent: TEST_USER_AGENT,
    fetchImpl: capture.fetch,
    server,
  });
  return { mb, capture };
}

describe("sandbox resource", () => {
  it("sends the policy listing request", async () => {
    const { mb, capture } = clientOver([jsonResponse([POLICY])]);

    await mb.sandbox.list();

    expect(capture.calls).toEqual([
      {
        url: "https://mb.example.com/metabase/api/mt/gtap",
        method: "GET",
        headers: JSON_READ_HEADERS,
        body: null,
      },
    ]);
  });

  it("answers every policy with no server total", async () => {
    const { mb } = clientOver([jsonResponse([POLICY])]);

    expect(await mb.sandbox.list()).toEqual({ data: [POLICY], total: null });
  });

  it("explains a premium refusal as the missing sandboxes token", async () => {
    const { mb } = clientOver(
      [premiumRefusalResponse("Sandboxes"), probeResponse(UNLICENSED)],
      UNLICENSED,
    );

    const error = await thrownBy(() => mb.sandbox.list());

    assert(error instanceof CapabilityError, "expected CapabilityError");
    expect(error.developerDetail).toEqual({
      reason: "missing-token-feature",
      detail:
        "This operation requires the 'sandboxes' premium feature (not enabled on this server).",
      feature: "rowSecurity",
      since: 58,
      tokenFeature: "sandboxes",
      serverVersion: "v1.58.0",
    });
  });
});
