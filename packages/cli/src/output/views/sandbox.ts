import { type Sandbox, SandboxCompact } from "@metabase/client/domain/sandbox";

import type { ResourceView } from "../view";

export const sandboxView: ResourceView<Sandbox> = {
  compactPick: SandboxCompact,
  tableColumns: [
    { key: "id", label: "ID" },
    { key: "group_id", label: "Group" },
    { key: "table_id", label: "Table" },
    { key: "card_id", label: "Card" },
  ],
};
