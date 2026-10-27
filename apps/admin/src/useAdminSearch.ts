import { computed, onScopeDispose, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { adminRepository, type Kind, type SearchRequest } from "./data";
export function useAdminSearch(kind: Kind) {
  const search = ref("");
  const q = ref("");
  const status = ref("");
  const limit = ref<SearchRequest["limit"]>(25);
  const sort = ref<SearchRequest["sort"]>("updated_desc");
  const cursors = ref<(string | null)[]>([null]);
  const page = ref(0);
  let timer: ReturnType<typeof setTimeout>;
  watch(search, (value) => { clearTimeout(timer); timer = setTimeout(() => { q.value = value.trim(); }, 300); });
  onScopeDispose(() => clearTimeout(timer));
  watch([q, status, limit, sort], () => { page.value = 0; cursors.value = [null]; }, { flush: "sync" });
  const request = computed<SearchRequest>(() => ({ q: q.value, status: status.value, limit: limit.value, sort: sort.value, cursor: cursors.value[page.value] ?? null }));
  const query = useQuery({
    queryKey: computed(() => ["admin", kind, request.value]),
    queryFn: ({ signal }) => adminRepository.search(kind, { ...request.value }, signal),
    // No accumulated pages or fetch-all; old pages expire after one minute.
    gcTime: 60_000,
  });
  const waiting = computed(() => query.isFetching.value || search.value.trim() !== q.value);
  function next() {
    const cursor = query.data.value?.nextCursor;
    if (!cursor || waiting.value) return;
    cursors.value[page.value + 1] = cursor; page.value++;
  }
  function previous() { if (page.value > 0 && !waiting.value) page.value--; }
  return { search, status, limit, sort, page, query, waiting, next, previous };
}
