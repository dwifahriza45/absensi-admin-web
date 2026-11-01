import type { MasterItem, MasterKind, MasterImportResult } from "@/types";
import { download, request } from "./client";
export const masterId = (kind: MasterKind, item: MasterItem) =>
  item[`${kind}_id`]!;
export function masterApi(kind: MasterKind) {
  const base = `/api/v1/admin/${kind}`;
  return {
    list: () => request<MasterItem[]>(base),
    detail: (id: string) =>
      request<MasterItem>(`${base}/${encodeURIComponent(id)}`),
    create: (name: string) =>
      request<MasterItem>(base, { method: "POST", body: { name } }),
    update: (id: string, name: string) =>
      request<MasterItem>(`${base}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { name },
      }),
    remove: (id: string) =>
      request<void>(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    export: (query: string) =>
      download(`${base}/export?q=${encodeURIComponent(query)}`, `${kind}.xlsx`),
    template: () =>
      download(`${base}/import/template`, `${kind}-template.xlsx`),
    import: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return request<MasterImportResult>(`${base}/import`, {
        method: "POST",
        body,
        timeoutMs: 45000,
      });
    },
  };
}
