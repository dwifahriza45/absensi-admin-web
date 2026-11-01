import type {
  Employee,
  FilterOptions,
  ImportResult,
  ImportRow,
  EmployeeWrite,
} from "@/types";
import { toQuery } from "./attendance.api";
import { download, request } from "./client";

export const employeeApi = {
  template: () =>
    download(
      "/api/v1/admin/employees/import/template",
      "template_data_pegawai.xlsx",
    ),
  export: (filter: {
    q: string;
    mitra_id: string;
    bidang_id: string;
    status: string;
  }) =>
    download(
      `/api/v1/admin/employees/export?${toQuery(filter)}`,
      "karyawan.xlsx",
    ),
  list: (
    filter: {
      mitra?: string;
      bidang?: string;
      includeInactive?: string;
    } = {},
  ) => request<Employee[]>(`/api/v1/admin/employees?${toQuery(filter)}`),

  detail: (id: string) =>
    request<Employee>(`/api/v1/admin/employees/${encodeURIComponent(id)}`),
  create: (body: EmployeeWrite) =>
    request<Employee>("/api/v1/admin/employees", { method: "POST", body }),
  update: (id: string, body: EmployeeWrite) =>
    request<Employee>(`/api/v1/admin/employees/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    }),
  setStatus: (id: string, isActive: boolean) =>
    request<Employee>(
      `/api/v1/admin/employees/${encodeURIComponent(id)}/status`,
      { method: "PUT", body: { isActive } },
    ),
  remove: (id: string) =>
    request<void>(`/api/v1/admin/employees/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  filterOptions: () =>
    request<FilterOptions>("/api/v1/admin/employees/filter-options"),

  import: (rows: ImportRow[], deactivateMissing: boolean) =>
    request<ImportResult>("/api/v1/admin/employees/import", {
      method: "POST",
      body: { rows, deactivateMissing },
    }),
};
