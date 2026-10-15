import { SandboxCompact } from "@metabase/client/domain/sandbox";
import { renderList } from "../../output/render";
import { listEnvelopeSchema } from "../../output/types";
import { sandboxView } from "../../output/views/sandbox";
import { windowList } from "../../output/window";
import { connectionFlags, listFlags, outputFlags, profileFlag } from "../flags";
import { defineMetabaseCommand } from "../runtime";

export const SandboxListEnvelope = listEnvelopeSchema(SandboxCompact);

export default defineMetabaseCommand({
  meta: { name: "list", description: "List row and column security policies" },
  details:
    "Each policy restricts one group on one table: the rows a card returns replace the table (`card_id`, or `null` to filter the table itself), and `attribute_remappings` maps user attributes onto the card's variables or the table's columns. Policies are created and changed with `mb permission update-graph`. Admins only.",
  requires: ["sandbox.list"],
  args: {
    ...outputFlags,
    ...listFlags,
    ...profileFlag,
    ...connectionFlags,
  },
  outputSchema: SandboxListEnvelope,
  examples: ["mb sandbox list", "mb sandbox list --json"],
  async run({ ctx, getClient }) {
    const client = await getClient();
    const { data } = await client.sandbox.list();
    renderList(windowList(data, ctx.range), sandboxView, ctx);
  },
});
