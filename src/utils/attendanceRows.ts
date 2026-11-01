import type { AdminAttendance, EmployeeLite } from "@/types";
import { fromIso, todayIso } from "./date";

// Menggabungkan data absen dan daftar pegawai menjadi baris tabel admin.
// Fungsi murni (tanpa React) agar mudah dites dan dipakai ulang untuk export Excel.

export type RowStatus =
  "bekerja" | "pulang" | "tinjau" | "tanpaPulang" | "belum";
export type StatFilter = "hadir" | RowStatus;

export interface AttendanceRow {
  key: string;
  date: string;
  employee: EmployeeLite;
  record: AdminAttendance | null;
  status: RowStatus;
}

export const STATUS_LABEL: Record<RowStatus, string> = {
  bekerja: "Sedang bekerja",
  pulang: "Sudah pulang",
  tinjau: "Perlu ditinjau",
  tanpaPulang: "Tanpa absen pulang",
  belum: "Belum absen",
};

const REVIEW_ACCURACY_M = 100;

export function statusOf(record: AdminAttendance): RowStatus {
  const location = record.checkInLocation;
  if (record.needsReview || !location || location.accuracyM > REVIEW_ACCURACY_M)
    return "tinjau";
  if (record.checkOutAt) return "pulang";
  return record.workDate === todayIso() ? "bekerja" : "tanpaPulang";
}

export interface RowsResult {
  /** Baris yang tampil sesuai filter status & pencarian. */
  rows: AttendanceRow[];
  counts: Record<StatFilter, number>;
  /** true bila periode = hari ini saja (mode pemantauan langsung). */
  isLive: boolean;
  isSingleDay: boolean;
}

interface BuildRowsInput {
  records: AdminAttendance[];
  employees: EmployeeLite[];
  days: string[];
  statFilter: StatFilter | null;
  query: string;
}

export function buildRows({
  records,
  employees,
  days,
  statFilter,
  query,
}: BuildRowsInput): RowsResult {
  const today = todayIso();
  const needle = query.trim().toLowerCase();
  const matchesName = (row: AttendanceRow) =>
    !needle || row.employee.name.toLowerCase().includes(needle);
  const isSingleDay = days.length === 1;
  const isLive = isSingleDay && days[0] === today;

  const recordRows: AttendanceRow[] = records.map((record) => ({
    key: `${record.workDate}|${record.employee.id}`,
    date: record.workDate,
    employee: record.employee,
    record,
    status: statusOf(record),
  }));

  // Pegawai yang tidak absen, hanya untuk hari yang sudah lewat atau hari ini.
  const recorded = new Set(recordRows.map((row) => row.key));
  const pastDays = days.filter((day) => fromIso(day) <= fromIso(today));
  const absentRows: AttendanceRow[] = [];
  for (const day of pastDays) {
    for (const employee of employees) {
      const key = `${day}|${employee.id}`;
      if (!recorded.has(key))
        absentRows.push({
          key,
          date: day,
          employee,
          record: null,
          status: "belum",
        });
    }
  }

  const countStatus = (status: RowStatus) =>
    recordRows.filter((row) => matchesName(row) && row.status === status)
      .length;
  const counts: Record<StatFilter, number> = {
    hadir: recordRows.filter(matchesName).length,
    bekerja: countStatus("bekerja"),
    pulang: countStatus("pulang"),
    tinjau: countStatus("tinjau"),
    tanpaPulang: countStatus("tanpaPulang"),
    belum: absentRows.filter(matchesName).length,
  };

  // Include missing dates when searching a name so one employee’s history shows both recorded and unrecorded days.
  const candidates =
    isSingleDay || statFilter === "belum" || !!needle
      ? [...recordRows, ...absentRows]
      : recordRows;
  const rows = candidates
    .filter((row) => {
      if (statFilter === "hadir" && !row.record) return false;
      if (statFilter && statFilter !== "hadir" && row.status !== statFilter)
        return false;
      return !needle || row.employee.name.toLowerCase().includes(needle);
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.record?.checkInAt ?? "").localeCompare(a.record?.checkInAt ?? "") ||
        a.employee.name.localeCompare(b.employee.name),
    );

  return { rows, counts, isLive, isSingleDay };
}
