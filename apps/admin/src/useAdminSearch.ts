import { computed, onScopeDispose, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { paginationPages } from "./pagination";
import { adminRepository, type Kind, type SearchRequest } from "./data";
export function useAdminSearch(kind: Kind) {
  const search = ref("");
  const q = ref("");
  const status = ref("");
  const limit = ref<SearchRequest["limit"]>(25);
  const sort = ref<SearchRequest["sort"]>("updated_desc");
  const page = ref(0);
  let timer: ReturnType<typeof setTimeout>;
  watch(search, (value) => { clearTimeout(timer); timer = setTimeout(() => { q.value = value.trim(); }, 300); });
  onScopeDispose(() => clearTimeout(timer));
  watch([q, status, limit, sort], () => { page.value = 0; }, { flush: "sync" });
  const request = computed<SearchRequest>(() => ({ q: q.value, status: status.value, limit: limit.value, sort: sort.value, page: page.value + 1 }));
  const query = useQuery({
    queryKey: computed(() => ["admin", kind, request.value]),
    queryFn: ({ signal }) => adminRepository.search(kind, { ...request.value }, signal),
    // No accumulated pages or fetch-all; old pages expire after one minute.
    gcTime: 60_000,
  });
  const waiting = computed(() => query.isFetching.value || search.value.trim() !== q.value);
  const totalPages = computed(() => Math.max(1, Math.ceil((query.data.value?.totalItems ?? 0) / limit.value)));
  const pageNumbers = computed(() => paginationPages(page.value + 1, totalPages.value));
  function goTo(number: number) {
    if (waiting.value || query.isError.value || number < 1 || number > totalPages.value) return;
    page.value = number - 1;
  }
  function next() { goTo(page.value + 2); }
  function previous() { goTo(page.value); }
  return { search, status, limit, sort, page, totalPages, pageNumbers, goTo, query, waiting, next, previous };
}
