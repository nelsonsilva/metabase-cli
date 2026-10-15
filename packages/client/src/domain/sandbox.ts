import { z } from "zod";

// A row and column security policy (a "sandbox", GTAP on the server): the group and table it
// restricts, the card whose results replace the table for that group (`null` filters the table
// itself), and how user attributes map onto the card's variables or the table's columns.
export const Sandbox = z
  .object({
    id: z.number().int(),
    group_id: z.number().int(),
    table_id: z.number().int(),
    card_id: z.number().int().nullable(),
    attribute_remappings: z.record(z.string(), z.unknown()).nullable(),
  })
  .loose();
export type Sandbox = z.infer<typeof Sandbox>;

export const SandboxCompact = Sandbox.pick({
  id: true,
  group_id: true,
  table_id: true,
  card_id: true,
  attribute_remappings: true,
}).strip();
export type SandboxCompact = z.infer<typeof SandboxCompact>;
