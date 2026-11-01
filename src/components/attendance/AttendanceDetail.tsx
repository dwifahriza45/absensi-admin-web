import { PdfIcon } from "@/components/ui/PdfIcon";
import { PhotoDownload } from "./PhotoDownload";
import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { GeoLocation } from "@/types";
import { STATUS_LABEL, type AttendanceRow } from "@/utils/attendanceRows";
import { formatDayShort, formatTime, todayIso } from "@/utils/date";
import { PhotoThumb } from "./PhotoThumb";

interface AttendanceDetailProps {
  onClose: () => void;
  row: AttendanceRow;
  totalSessions: number;
  showDate: boolean;
  onZoomToLocation: (location: GeoLocation) => void;
  onOpenPhoto: (url: string, title: string) => void;
}

const locationText = (location: GeoLocation | null) =>
  location
    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (± ${location.accuracyM} m)`
    : "Tidak ada";

/** Panel detail: selfie masuk/pulang, keterangan, dan foto hasil kerja per sesi. */
export function AttendanceDetail({
  onClose,
  row,
  totalSessions,
  showDate,
  onZoomToLocation,
  onOpenPhoto,
}: AttendanceDetailProps) {
  const { employee, record } = row;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const { downloadAttendancePdf } = await import("@/utils/attendancePdf");
      await downloadAttendancePdf(row, totalSessions);
    } catch (err) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : "Gagal mengunduh PDF. Silakan coba lagi.",
      );
    } finally {
      setDownloading(false);
    }
  };
  const sessionNumbers = Array.from({ length: totalSessions }, (_, i) => i + 1);

  return (
    <div className="detail">
      <div className="detail__head">
        <div>
          <span className="detail__eyebrow">
            DETAIL ABSENSI · {formatDayShort(row.date)}
            {!showDate && row.date === todayIso() ? " · HARI INI" : ""}
          </span>
          <div className="detail__name-row">
            <strong className="detail__name">{employee.name}</strong>
            <Button
              className="btn--small"
              loading={downloading}
              onClick={() => void downloadPdf()}
              aria-label="Unduh PDF"
              icon={<PdfIcon />}
            >
              Unduh
            </Button>
          </div>
          <span className="detail__meta">
            {[employee.mitra, employee.bidang].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="detail__head-actions">
          <Badge label={STATUS_LABEL[row.status]} tone={row.status} />
          <Button className="btn--small" onClick={onClose} icon={<span aria-hidden="true">×</span>}>
            Tutup detail
          </Button>
        </div>
      </div>
      <div className="detail__toolbar">
        <span>Ringkasan kehadiran</span>
        <div className="detail__head-actions">
          {record?.checkInLocation && (
            <Button
              className="btn--small"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6" />
                </svg>
              }
              onClick={() => onZoomToLocation(record.checkInLocation!)}
            >
              Zoom ke lokasi
            </Button>
          )}
        </div>
      </div>

      {downloadError && (
        <p className="text-error" role="alert">
          {downloadError}
        </p>
      )}
      <div className="detail__selfies">
        {[
          {
            label: "Masuk",
            photoId: record?.check_in_selfie_id,
            time: record?.checkInAt,
            location: record?.checkInLocation,
          },
          {
            label: "Pulang",
            photoId: record?.check_out_selfie_id,
            time: record?.checkOutAt,
            location: record?.checkOutLocation,
          },
        ].map((selfie) => (
          <div key={selfie.label} className="detail__selfie">
            <PhotoThumb
              photoId={selfie.photoId}
              label={`${employee.name} · Selfie ${selfie.label.toLowerCase()}`}
              className="photo-thumb--selfie"
              onOpen={onOpenPhoto}
            />
            <div className="detail__capture-head">
              <strong>Absen {selfie.label.toLowerCase()}</strong>
              <span>
                {selfie.time
                  ? `${formatTime(selfie.time)} WIB`
                  : "Belum tercatat"}
              </span>
            </div>
            <div className="detail__location">
              <span>Lokasi {selfie.label.toLowerCase()}</span>
              <strong>{locationText(selfie.location ?? null)}</strong>
            </div>
            <PhotoDownload
              photoId={selfie.photoId}
              filename={`${employee.name}-${row.date}-selfie-${selfie.label.toLowerCase()}`}
              label={`Unduh foto ${selfie.label.toLowerCase()}`}
            />
          </div>
        ))}
      </div>

      {(record?.checkOutReason ||
        record?.earlyLeave ||
        record?.needsReview) && (
        <div className="detail__notes">
          <strong>Catatan kehadiran</strong>
          <dl className="detail__facts">
            {record?.needsReview && (
              <div>
                <dt>Perlu ditinjau</dt>
                <dd>Data absensi ditandai untuk pemeriksaan PIC.</dd>
              </div>
            )}
            {record?.checkOutReason && (
              <div>
                <dt>Alasan pulang</dt>
                <dd>{record.checkOutReason}</dd>
              </div>
            )}
            {record?.earlyLeave && (
              <div>
                <dt>Permintaan pulang awal</dt>
                <dd>
                  {formatTime(record.earlyLeave.requestedAt)} WIB ·{" "}
                  {record.earlyLeave.reason}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="detail__work">
        <div className="detail__section-head">
          <strong>Dokumentasi pekerjaan</strong>
          <span>
            {record?.sessions.length ?? 0} dari {totalSessions} foto
          </span>
        </div>
        <div className="detail__work-grid">
          {sessionNumbers.map((no) => {
            const session = record?.sessions.find((s) => s.no === no);
            const label = `Sesi ${no}${session ? ` · ${formatTime(session.receivedAt)}` : ""}`;
            return (
              <div key={no} className="detail__work-item">
                <PhotoThumb
                  photoId={session?.photo_id}
                  label={`${employee.name} · Hasil ${label}`}
                  className="photo-thumb--work"
                  fallback="Belum dikirim"
                  onOpen={onOpenPhoto}
                />
                <span>{label}</span>
                <PhotoDownload
                  photoId={session?.photo_id}
                  filename={`${employee.name}-${row.date}-sesi-${no}`}
                  label={`Unduh foto sesi ${no}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
