import { employeeApi } from "@/api/employee.api";
import { normalizePhone } from "./phone";
import type { ImportRow } from "@/types";
import { STATUS_LABEL, type AttendanceRow } from "./attendanceRows";
import { attendanceRangeError, formatTime, fromIso } from "./date";

/** Unduh data absen yang sedang tampil sebagai file .xlsx. */
export async function exportAttendance(
  rows: AttendanceRow[],
  from: string,
  to: string,
  scope: { mitra: string; bidang: string },
) {
  const rangeError = attendanceRangeError(from, to);
  if (rangeError) throw new Error(rangeError);
  if (!scope.mitra.trim() || !scope.bidang.trim())
    throw new Error(
      "Silakan pilih Mitra dan Bidang terlebih dahulu sebelum mengekspor data absensi.",
    );
  const XLSX = await import("xlsx");
  const data = rows.map(({ date, employee, record, status }) => {
    const location = record?.checkInLocation;
    return {
      Tanggal: fromIso(date).toLocaleDateString("id-ID"),
      Nama: employee.name,
      Mitra: employee.mitra,

      Bidang: employee.bidang,
      Masuk: record ? formatTime(record.checkInAt) : "",
      Pulang: record?.checkOutAt ? formatTime(record.checkOutAt) : "",
      Status: STATUS_LABEL[status],
      "Lokasi masuk": location
        ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
        : "",
      "Akurasi (m)": location?.accuracyM ?? "",
      "Sesi foto terkirim": record ? record.sessions.length : "",
      "Alasan pulang": record?.checkOutReason ?? "",
    };
  });

  const sheet = XLSX.utils.json_to_sheet(data);
  sheet["!cols"] = Object.keys(data[0] ?? { Tanggal: "" }).map((key) => ({
    wch: Math.max(key.length, 14),
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Absensi");
  XLSX.writeFile(book, `absensi_${from}_sd_${to}.xlsx`);
}

/** Download the server-generated template with styled headers. */
export async function downloadEmployeeTemplate() {
  await employeeApi.template();
}

// Nama kolom yang diterima (tanpa spasi/tanda baca, huruf kecil).
const COLUMN_ALIASES: Record<keyof ImportRow, string[]> = {
  nik: ["nik", "nomorindukkependudukan"],
  employee_id: ["idkaryawan", "employeeid", "idpegawai"],
  name: ["namalengkap", "nama", "namapegawai", "namakaryawan"],
  mitra: ["mitra", "kantor"],

  bidang: ["jobdesk", "bidang", "bidangpekerjaan", "jabatan", "pekerjaan"],
  phone: ["nomorhp", "nohp", "hp", "nomortelepon", "notelp", "telepon"],
};

const normalizeHeader = (header: string) =>
  header.toLowerCase().replace(/[^a-z]/g, "");

/** Membaca file Excel/CSV menjadi baris import. Validasi akhir tetap dilakukan server. */
export async function readEmployeeFile(file: File): Promise<ImportRow[]> {
  const XLSX = await import("xlsx");
  if (file.size > 4 * 1024 * 1024)
    throw new Error("Ukuran file maksimal 4 MiB.");
  const buffer = await file.arrayBuffer();
  validateWorkbookSize(buffer);
  const book = XLSX.read(buffer, { type: "array", sheetRows: 5002 });
  const sheet = book.Sheets[book.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (raw.length > 5000) throw new Error("Maksimal 5.000 baris per import.");
  return raw
    .map((row) => {
      const byHeader = new Map(
        Object.entries(row).map(([key, value]) => [
          normalizeHeader(key),
          String(value).trim(),
        ]),
      );
      const pick = (field: keyof ImportRow) =>
        COLUMN_ALIASES[field]
          .map((alias) => byHeader.get(alias))
          .find(Boolean) ?? "";
      return {
        nik: pick("nik"),
        employee_id: pick("employee_id"),
        name: pick("name"),
        mitra: pick("mitra"),

        bidang: pick("bidang"),
        phone: normalizePhone(pick("phone")),
      };
    })
    .filter((row) => row.name || row.phone || row.nik || row.employee_id);
}

// Check ZIP metadata before parsing to bound memory for compressed workbooks.
function validateWorkbookSize(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (
    let i = buffer.byteLength - 22;
    i >= Math.max(0, buffer.byteLength - 65557);
    i--
  ) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("Gunakan file Excel .xlsx yang valid.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  let total = 0;
  if (count > 1024)
    throw new Error("File Excel terlalu kompleks. Gunakan template.");
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > buffer.byteLength ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error("File Excel tidak valid.");
    total += view.getUint32(offset + 24, true);
    if (total > 32 * 1024 * 1024)
      throw new Error(
        "Isi file Excel terlalu besar. Maksimal 32 MiB setelah dibuka.",
      );
    offset +=
      46 +
      view.getUint16(offset + 28, true) +
      view.getUint16(offset + 30, true) +
      view.getUint16(offset + 32, true);
  }
}
