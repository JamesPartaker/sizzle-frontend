import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { createOrderingClient, type OrderDraft } from "@sizzle/api-client";
import { apiOrigin } from "../api-origin";
import { isDemo } from "../api";

export const orderingApi = createOrderingClient(apiOrigin);
export function useOrder() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["order-draft"],
    queryFn: () => orderingApi.draft(),
    enabled: !isDemo,
    refetchOnWindowFocus: true,
  });
  function accept(draft: OrderDraft) {
    client.setQueryData(["order-draft"], draft);
  }
  return { query, accept };
}
