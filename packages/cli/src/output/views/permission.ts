import { PermissionsGraphRevision } from "@metabase/client/domain/permission";

import type { ResourceView } from "../view";

export const permissionsGraphRevisionView: ResourceView<PermissionsGraphRevision> = {
  compactPick: PermissionsGraphRevision.pick({ revision: true }).strip(),
  tableColumns: [{ key: "revision", label: "Revision" }],
};
