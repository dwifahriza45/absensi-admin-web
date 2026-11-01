import type { AdminAttendance, AttendanceFilter } from "@/types";
import { request, requestBlob } from "./client";

const toQuery = (params: object) =>
  new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();

export const attendanceApi = {
  recap: async (
    filter: AttendanceFilter & {
      q: string;
      status: string;
      include_absent: string;
    },
  ) => {
    const blob = await requestBlob(
      `/api/v1/admin/attendances/recap?${toQuery(filter)}`,
      3600000,
    );
    if (
      !(await blob.slice(0, 5).text()).startsWith("%PDF-") ||
      !(await blob.slice(-1024).text()).trimEnd().endsWith("%%EOF")
    )
      throw new Error(
        "Rekap belum selesai atau terputus. Silakan coba kembali dengan filter yang lebih spesifik.",
      );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `rekap-absensi-${filter.from}-sd-${filter.to}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  list: (filter: AttendanceFilter) =>
    request<AdminAttendance[]>(`/api/v1/admin/attendances?${toQuery(filter)}`),

  version: (date: string) =>
    request<{ version: number }>(
      `/api/v1/admin/attendances/version?date=${encodeURIComponent(date)}`,
    ),
};

export { toQuery };
