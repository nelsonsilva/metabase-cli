import { z } from "zod";

export const ViewDataPermission = z.enum([
  "unrestricted",
  "legacy-no-self-service",
  "blocked",
  "sandboxed",
  "impersonated",
]);
export type ViewDataPermission = z.infer<typeof ViewDataPermission>;

export const CreateQueriesPermission = z.enum(["query-builder-and-native", "query-builder", "no"]);
export type CreateQueriesPermission = z.infer<typeof CreateQueriesPermission>;

export const DownloadPermission = z.enum(["full", "limited"]);
export type DownloadPermission = z.infer<typeof DownloadPermission>;

export const DataModelPermission = z.literal("all");
export type DataModelPermission = z.infer<typeof DataModelPermission>;

export const YesNoPermission = z.enum(["yes", "no"]);
export type YesNoPermission = z.infer<typeof YesNoPermission>;

// One value for the whole database, or one per schema (the empty string names the schema-less
// case), or one per table id under a schema; a schema whose tables all agree is collapsed to the
// value.
function granular<T extends z.ZodType>(value: T) {
  const perTable = z.record(z.string(), value);
  const perSchema = z.record(z.string(), z.union([value, perTable]));
  return z.union([value, perSchema]);
}

// Metabase leaves a permission out at its least permissive value (`blocked`, `no`, no download,
// no data-model access) at every level, so an absent key is that value, never an unknown.
export const DatabasePermissions = z
  .object({
    "view-data": granular(ViewDataPermission).optional(),
    "create-queries": granular(CreateQueriesPermission).optional(),
    download: z
      .object({ schemas: granular(DownloadPermission) })
      .loose()
      .optional(),
    "data-model": z
      .object({ schemas: granular(DataModelPermission) })
      .loose()
      .optional(),
    details: YesNoPermission.optional(),
    transforms: YesNoPermission.optional(),
  })
  .loose();
export type DatabasePermissions = z.infer<typeof DatabasePermissions>;

// `groups` is keyed by group id then database id, both as JSON keys; `revision` is the latest
// permissions revision, `0` before the first change on a fresh server.
export const PermissionsGraph = z
  .object({
    revision: z.number().int().nonnegative(),
    groups: z.record(z.string(), z.record(z.string(), DatabasePermissions)),
  })
  .loose();
export type PermissionsGraph = z.infer<typeof PermissionsGraph>;

// A row and column security policy as a graph update creates or changes it: with an `id` it updates
// that policy, without one it creates a policy for the group and table.
export const SandboxInput = z
  .object({
    id: z.number().int().optional(),
    group_id: z.number().int(),
    table_id: z.number().int(),
    card_id: z.number().int().nullable(),
    attribute_remappings: z.record(z.string(), z.unknown()),
  })
  .strict();
export type SandboxInput = z.infer<typeof SandboxInput>;

// Only the groups and databases named in `groups` change; `revision` must be the latest the server
// holds, or it rejects the update.
export const PermissionsGraphUpdateInput = z
  .object({
    revision: z.number().int().nonnegative(),
    groups: z.record(z.string(), z.record(z.string(), DatabasePermissions)),
    sandboxes: z.array(SandboxInput).optional(),
  })
  .strict();
export type PermissionsGraphUpdateInput = z.infer<typeof PermissionsGraphUpdateInput>;

// The answer to an update that skips returning the graph: the revision the update created.
export const PermissionsGraphRevision = z
  .object({ revision: z.number().int().nonnegative() })
  .loose();
export type PermissionsGraphRevision = z.infer<typeof PermissionsGraphRevision>;
