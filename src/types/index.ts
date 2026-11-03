// Tipe data dari API backend (lihat absensi-api/internal/domain/*/dto.go).

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracyM: number;
}

export interface EmployeeLite {
  id: string;
  name: string;
  mitra: string;

  bidang: string;
}

export interface Employee extends EmployeeLite {
  has_attendance: boolean;
  can_delete: boolean;
  delete_reason?: string;
  employee_id: string;
  mitra_id?: string;
  bidang_id?: string;
  nik?: string;
  phone?: string;
  isActive: boolean;
}

export interface SubmittedSession {
  no: number;
  photo_id: string;
  receivedAt: string;
}

export interface AdminAttendance {
  id: string;
  workDate: string;
  checkInAt: string;
  checkInLocation: GeoLocation | null;
  check_in_selfie_id: string | null;
  needsReview: boolean;
  checkOutAt: string | null;
  checkOutLocation: GeoLocation | null;
  check_out_selfie_id: string | null;
  checkOutReason: string | null;
  earlyLeave: { requestedAt: string; reason: string } | null;
  employee: EmployeeLite;
  sessions: SubmittedSession[];
}

export interface FilterOptions {
  mitra: string[];

  bidang: string[];
}

export interface ImportRow {
  nik: string;
  employee_id?: string;
  name: string;
  mitra: string;

  bidang: string;
  phone: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  deactivated: number;
  skipped: { row: number; name: string; reason: string }[];
}

/** Filter yang dipilih admin. Tanggal berformat YYYY-MM-DD. */
export interface AttendanceFilter {
  from: string;
  to: string;
  mitra: string;

  bidang: string;
}

export type MasterKind = "mitra" | "bidang";
export interface MasterItem {
  employee_count: number;
  can_delete: boolean;
  delete_reason?: string;
  id: string;
  name: string;
  mitra_id?: string;
  bidang_id?: string;
}
export interface MasterImportResult {
  total: number;
  success: number;
  skip: number;
  error: number;
  rows: {
    row: number;
    name: string;
    status: "success" | "skip" | "error";
    message: string;
  }[];
}
export interface EmployeeWrite {
  nik: string;
  name: string;
  phone?: string;
  mitra_id: string;
  bidang_id: string;

  isActive?: boolean;
}
