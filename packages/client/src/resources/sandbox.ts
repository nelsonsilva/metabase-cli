import { z } from "zod";

import { Sandbox } from "../domain/sandbox";
import type { RequestOptions, Transport } from "../http/transport";
import type { ListResult } from "../list";
import { explainer } from "../version/refusal";

export function sandboxResource(transport: Transport) {
  const { explain } = explainer(transport, "sandbox");

  /**
   * List row and column security policies, every group's on every table. Admin only. Policies are
   * created, changed and removed through `permission.updateGraph`.
   */
  async function list(options: RequestOptions = {}): Promise<ListResult<Sandbox>> {
    const data = await transport.requestParsed(z.array(Sandbox), "/api/mt/gtap", { ...options });
    return { data, total: null };
  }

  return { list: explain("list", list) };
}
