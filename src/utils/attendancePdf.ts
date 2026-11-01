import type { GeoLocation } from "@/types";
import { photoApi } from "@/api/photo.api";
import { COMPANY_NAME } from "@/config/text";
import logoUrl from "@/assets/logo-hri.png";
import { STATUS_LABEL, type AttendanceRow } from "./attendanceRows";
import { fromIso } from "./date";
const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });

async function imageData(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    const scale = Math.min(
      1,
      1400 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Gagal menyiapkan foto PDF.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return {
      data: canvas.toDataURL("image/jpeg", 0.88),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A private, downloadable PDF for exactly the selected employee and date. */
export async function downloadAttendancePdf(
  row: AttendanceRow,
  totalSessions: number,
) {
  const { jsPDF } = await import("jspdf");
  const { employee, record } = row;
  const ids = [
    ...new Set(
      [
        record?.check_in_selfie_id,
        record?.check_out_selfie_id,
        ...(record?.sessions.map((s) => s.photo_id) ?? []),
      ].filter((id): id is string => !!id),
    ),
  ];
  // Fetch through authenticated API; never expose storage paths or public photo URLs.
  const photos = new Map(
    await Promise.all(
      ids.map(
        async (id) =>
          [id, await imageData(await photoApi.fetchBlob(id))] as const,
      ),
    ),
  );
  const logo = await imageData(await (await fetch(logoUrl)).blob());
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: `Laporan Absensi - ${employee.name} - ${row.date}`,
    author: COMPANY_NAME,
    subject: "Detail absensi karyawan",
  });
  const navy: [number, number, number] = [24, 51, 107];
  let y = 0;
  const text = (
    value: string,
    x: number,
    at: number,
    size = 10,
    bold = false,
    color: [number, number, number] = [30, 41, 59],
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, at);
  };
  const heading = (label: string) => {
    doc.setDrawColor(220, 227, 239);
    doc.line(16, y, 194, y);
    y += 9;
    text(label, 16, y, 12, true, navy);
    y += 8;
  };
  const header = () => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, 210, 32, "F");
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(16, 7, 25, 18, 3, 3, "F");
    const ratio = Math.min(21 / logo.width, 14 / logo.height);
    doc.addImage(
      logo.data,
      "JPEG",
      18 + (21 - logo.width * ratio) / 2,
      9 + (14 - logo.height * ratio) / 2,
      logo.width * ratio,
      logo.height * ratio,
    );
    text(COMPANY_NAME, 47, 14, 12, true, [255, 255, 255]);
    text("LAPORAN ABSENSI KARYAWAN", 47, 23, 9, false, [220, 230, 250]);
    y = 44;
  };
  const line = (label: string, value: string) => {
    const lines = doc.splitTextToSize(value || "-", 119) as string[];
    if (y + lines.length * 5 > 268) {
      doc.addPage();
      header();
    }
    text(label, 16, y, 9, false, [100, 116, 139]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(lines, 75, y);
    y += Math.max(8, lines.length * 5 + 3);
  };
  const location = (l: GeoLocation | null | undefined) =>
    l
      ? `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)} (+/- ${l.accuracyM} m)`
      : "Belum tercatat";
  const image = (
    id: string | null | undefined,
    x: number,
    top: number,
    w: number,
    h: number,
  ) => {
    doc.setFillColor(242, 245, 250);
    doc.roundedRect(x, top, w, h, 2, 2, "F");
    const photo = id ? photos.get(id) : undefined;
    if (!photo) {
      text("Belum ada foto", x + 5, top + h / 2, 10, false, [100, 116, 139]);
      return;
    }
    const ratio = Math.min((w - 4) / photo.width, (h - 4) / photo.height);
    doc.addImage(
      photo.data,
      "JPEG",
      x + (w - photo.width * ratio) / 2,
      top + (h - photo.height * ratio) / 2,
      photo.width * ratio,
      photo.height * ratio,
    );
  };
  header();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const name = doc.splitTextToSize(employee.name, 178) as string[];
  doc.setTextColor(...navy);
  doc.text(name, 16, y);
  y += name.length * 7 + 4;
  line(
    "Tanggal",
    fromIso(row.date).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
  line("Mitra", employee.mitra);
  line("Bidang", employee.bidang);
  line("Status", STATUS_LABEL[row.status]);
  heading("RINGKASAN KEHADIRAN");
  line(
    "Absen masuk",
    record ? formatTime(record.checkInAt) + " WIB" : "Belum absen",
  );
  line("Lokasi masuk", location(record?.checkInLocation));
  line(
    "Absen pulang",
    record?.checkOutAt
      ? formatTime(record.checkOutAt) + " WIB"
      : "Belum absen pulang",
  );
  line("Lokasi pulang", location(record?.checkOutLocation));
  if (record?.checkOutReason) line("Alasan pulang", record.checkOutReason);
  if (record?.earlyLeave)
    line(
      "Pulang lebih awal",
      `${formatTime(record.earlyLeave.requestedAt)} WIB - ${record.earlyLeave.reason}`,
    );
  if (y + 88 > 271) {
    doc.addPage();
    header();
  }
  heading("DOKUMENTASI SELFIE");
  image(record?.check_in_selfie_id, 16, y, 85, 65);
  image(record?.check_out_selfie_id, 109, y, 85, 65);
  text("SELFIE MASUK", 16, y + 72, 9, true, navy);
  text("SELFIE PULANG", 109, y + 72, 9, true, navy);
  doc.addPage();
  header();
  heading(
    `HASIL PEKERJAAN (${record?.sessions.length ?? 0} DARI ${totalSessions})`,
  );
  const count = Math.max(
    totalSessions,
    ...(record?.sessions.map((s) => s.no) ?? [0]),
  );
  for (let i = 0; i < count; i++) {
    if (i > 0 && i % 3 === 0) {
      y += 90;
      if (y + 82 > 270) {
        doc.addPage();
        header();
      }
    }
    const x = 16 + (i % 3) * 61;
    const session = record?.sessions.find((s) => s.no === i + 1);
    image(session?.photo_id, x, y, 56, 65);
    text(`SESI ${i + 1}`, x, y + 72, 9, true, navy);
    text(
      session
        ? `Terkirim ${formatTime(session.receivedAt)} WIB`
        : "Belum dikirim",
      x,
      y + 78,
      8,
      false,
      [100, 116, 139],
    );
  }
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(220, 227, 239);
    doc.line(16, 280, 194, 280);
    text(
      "Dokumen internal - berisi data pribadi karyawan",
      16,
      286,
      8,
      false,
      [100, 116, 139],
    );
    text(`${page} / ${total}`, 184, 286, 8, false, [100, 116, 139]);
  }
  const safe =
    employee.name
      .replace(/[^a-zA-Z0-9 -]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "karyawan";
  doc.save(`absensi-${safe}-${row.date}.pdf`);
}
