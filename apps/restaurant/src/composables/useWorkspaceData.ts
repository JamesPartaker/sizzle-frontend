import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { api } from "../api";
import { useWorkspaceStore } from "../stores/workspace";
import type { Design, NewDesign, NewAsset } from "@sizzle/schemas";
export function useWorkspaceData() {
  const query = useQueryClient();
  const ui = useWorkspaceStore();
  const designs = useQuery({
    queryKey: ["designs"],
    queryFn: () => api.designs.list(),
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });
  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.assets.list(),
  });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.orders.list(),
  });
  const onError = (error: Error) =>
    ui.notify(error.message || "Something went wrong. Please try again.");
  const refreshDesigns = () =>
    query.invalidateQueries({ queryKey: ["designs"] });
  const create = useMutation({
    mutationFn: (input: NewDesign) => api.designs.create(input),
    onSuccess: refreshDesigns,
    onError,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.designs.rename(id, name),
    onSuccess: refreshDesigns,
    onError,
  });
  const duplicate = useMutation({
    mutationFn: (id: string) => api.designs.duplicate(id),
    onSuccess: () => {
      void refreshDesigns();
      ui.notify("A fresh copy, ready for your next idea.");
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.designs.remove(id),
    onSuccess: refreshDesigns,
    onError,
  });
  const restore = useMutation({
    mutationFn: (design: Design) => api.designs.restore(design),
    onSuccess: refreshDesigns,
    onError,
  });
  const upload = useMutation({
    mutationFn: (input: NewAsset) => api.assets.upload(input),
    onSuccess: () => query.invalidateQueries({ queryKey: ["assets"] }),
    onError,
  });
  return {
    designs,
    templates,
    assets,
    orders,
    create,
    rename,
    duplicate,
    remove,
    restore,
    upload,
  };
}
