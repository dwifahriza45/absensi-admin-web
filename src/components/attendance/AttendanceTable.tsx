import { Badge } from "@/components/ui";
import type { AttendanceRow } from "@/utils/attendanceRows";
import { STATUS_LABEL } from "@/utils/attendanceRows";
import { fromIso, formatTime } from "@/utils/date";
import { PhotoThumb } from "./PhotoThumb";

interface AttendanceTableProps {
  rows: AttendanceRow[];
  isLive: boolean;
  selectedKey: string | null;
  onSelect: (row: AttendanceRow) => void;
}

/** Tabel absen dikelompokkan per mitra. */
export function AttendanceTable({
  rows,
  isLive,
  selectedKey,
  onSelect,
}: AttendanceTableProps) {
  const groups = groupByMitra(rows);

  return (
    <div className="table">
      <div className="table__row table__row--head">
        <span>SELFIE</span>
        <span>PEGAWAI</span>
        <span>TANGGAL</span>
        <span>MASUK</span>
        <span>PULANG</span>
        <span>STATUS</span>
      </div>

      {rows.length === 0 && (
        <div className="table__empty">Tidak ada data untuk filter ini.</div>
      )}

      {groups.map(([mitra, groupRows]) => {
        const present = groupRows.filter((row) => row.record).length;
        return (
          <div key={mitra}>
            <div className="table__group">
              <span>{mitra || "Tanpa mitra"}</span>
              <span className="table__group-meta">
                {isLive
                  ? `${present} dari ${groupRows.length} sudah absen`
                  : `${present} absen`}
              </span>
            </div>
            {groupRows.map((row) => (
              <button
                key={row.key}
                type="button"
                className={`table__row ${selectedKey === row.key ? "table__row--selected" : ""}`}
                onClick={() => onSelect(row)}
              >
                <PhotoThumb
                  photoId={row.record?.check_in_selfie_id}
                  label={row.employee.name}
                  className="photo-thumb--avatar"
                  fallback={initials(row.employee.name)}
                />
                <span className="table__name">
                  <strong>{row.employee.name}</strong>
                  <span>
                    {[row.employee.bidang].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <time className="table__date" dateTime={row.date}>
                  {fromIso(row.date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
                <span className="table__time">
                  {row.record ? formatTime(row.record.checkInAt) : "—"}
                </span>
                <span className="table__time">
                  {row.record?.checkOutAt
                    ? formatTime(row.record.checkOutAt)
                    : "—"}
                </span>
                <Badge label={STATUS_LABEL[row.status]} tone={row.status} />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function groupByMitra(rows: AttendanceRow[]): [string, AttendanceRow[]][] {
  const groups = new Map<string, AttendanceRow[]>();
  for (const row of rows) {
    const key = row.employee.mitra;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
