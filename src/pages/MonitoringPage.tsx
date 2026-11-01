import { attendanceApi } from "@/api/attendance.api";
import { attendanceRangeError, todayIso } from "@/utils/date";
import { Modal, Button } from "@/components/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { AttendanceDetail } from "@/components/attendance/AttendanceDetail";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import {
  FilterBar,
  INITIAL_FILTER,
  type FilterState,
} from "@/components/attendance/FilterBar";
import { PhotoLightbox } from "@/components/attendance/PhotoThumb";
import { StatCards } from "@/components/attendance/StatCards";
import {
  AttendanceMap,
  type AttendanceMapHandle,
} from "@/components/map/AttendanceMap";
import { Toast } from "@/components/ui";
import { useAttendances } from "@/hooks/useAttendances";
import { useEmployees } from "@/hooks/useEmployees";
import {
  buildRows,
  type AttendanceRow,
  type StatFilter,
} from "@/utils/attendanceRows";
import { daysBetween, formatDayShort, monthRange, rangeOf } from "@/utils/date";
import { exportAttendance } from "@/utils/excel";

const TOTAL_SESSIONS = 3; // samakan dengan SCHEDULE_PHOTO_SESSIONS di backend
const TOAST_MS = 5000;

export function MonitoringPage() {
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);
  const [statFilter, setStatFilter] = useState<StatFilter | null>(null);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const mapRef = useRef<AttendanceMapHandle>(null);

  const range = useMemo(
    () => rangeOf(filter.period, filter.customFrom, filter.customTo),
    [filter.period, filter.customFrom, filter.customTo],
  );
  const rangeError = attendanceRangeError(range.from, range.to);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const apiFilter = useMemo(
    () => ({
      ...(rangeError ? { from: todayIso(), to: todayIso() } : range),
      mitra: filter.mitra,

      bidang: filter.bidang,
    }),
    [range, rangeError, filter.mitra, filter.bidang],
  );
  const employeeFilter = useMemo(
    () => ({
      mitra: filter.mitra,

      bidang: filter.bidang,
    }),
    [filter.mitra, filter.bidang],
  );

  const attendances = useAttendances(apiFilter);
  const {
    employees,
    options,
    loading: employeesLoading,
    error: employeesError,
  } = useEmployees(employeeFilter);

  const days = useMemo(
    () => (rangeError ? [] : daysBetween(range.from, range.to)),
    [range, rangeError],
  );
  const { rows, counts, isLive, isSingleDay } = useMemo(
    () =>
      buildRows({
        records: rangeError ? [] : attendances.records,
        employees,
        days,
        statFilter,
        query,
      }),
    [attendances.records, employees, days, statFilter, query, rangeError],
  );
  const exportData = async (kind: "excel" | "pdf") => {
    if (rangeError) {
      setExportError(rangeError);
      return;
    }
    if (!filter.mitra.trim() || !filter.bidang.trim()) {
      setExportError(
        "Silakan pilih Mitra dan Bidang terlebih dahulu sebelum mengunduh rekap atau mengekspor data absensi.",
      );
      return;
    }
    if (exporting) return;
    if (
      attendances.loading ||
      attendances.error ||
      employeesLoading ||
      employeesError
    ) {
      setExportError(
        "Data belum siap. Tunggu hingga data selesai dimuat atau coba muat ulang.",
      );
      return;
    }
    setExporting(kind);
    setExportError(null);
    try {
      if (kind === "excel")
        await exportAttendance(rows, range.from, range.to, {
          mitra: filter.mitra,
          bidang: filter.bidang,
        });
      else
        await attendanceApi.recap({
          ...apiFilter,
          q: query.trim(),
          status: statFilter ?? "",
          include_absent: String(
            isSingleDay || !!query.trim() || statFilter === "belum",
          ),
        });
    } catch (err) {
      setExportError(
        err instanceof Error
          ? err.message
          : "Gagal menyiapkan unduhan. Silakan coba kembali.",
      );
    } finally {
      setExporting(null);
    }
  };
  const selectedRow = rows.find((row) => row.key === selectedKey) ?? null;

  // Notifikasi kejadian baru (absen masuk, pulang, kirim foto).
  const { event, clearEvent } = attendances;
  useEffect(() => {
    if (!event) return;
    setToast(event);
    clearEvent();
  }, [event, clearEvent]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const updateFilter = (patch: Partial<FilterState>) => {
    setFilter((current) => ({ ...current, ...patch }));
    setSelectedKey(null);
  };

  const selectRow = (row: AttendanceRow) => {
    if (selectedKey === row.key) {
      setSelectedKey(null);
      return;
    }
    setSelectedKey(row.key);
    if (row.record?.checkInLocation)
      mapRef.current?.flyTo(row.record.checkInLocation);
  };

  const periodLabel = isSingleDay
    ? isLive
      ? "Hari ini"
      : formatDayShort(range.from)
    : `${formatDayShort(range.from)} – ${formatDayShort(range.to)}`;
  const locatedCount = rows.filter((row) => row.record?.checkInLocation).length;

  return (
    <div className="monitoring">
      <div className="monitoring-live">
        <span>
          {isLive && <span className="live-dot" aria-hidden="true" />}
          {isLive ? "Pemantauan langsung" : "Riwayat absensi"}
        </span>
        <span>
          Diperbarui {attendances.updatedAt?.toLocaleTimeString("id-ID") ?? "—"}
        </span>
      </div>

      <FilterBar
        value={filter}
        range={range}
        options={options}
        onChange={updateFilter}
        onMonth={(month) =>
          updateFilter({ period: "custom", ...toCustom(monthRange(month)) })
        }
        hasExtraFilters={!!query.trim() || statFilter !== null}
        onReset={() => {
          setFilter(INITIAL_FILTER);
          setStatFilter(null);
          setQuery("");
        }}
        onExport={() => void exportData("excel")}
        onRecap={() => void exportData("pdf")}
        exporting={exporting}
        exportDisabled={
          !rangeError &&
          (attendances.loading ||
            !!attendances.error ||
            employeesLoading ||
            !!employeesError)
        }
      />

      {rangeError && (
        <p className="export-range-notice" role="alert">
          {rangeError}
        </p>
      )}
      {exportError && (
        <Modal
          title="Unduhan belum dapat diproses"
          footer={
            <Button variant="primary" onClick={() => setExportError(null)}>
              Mengerti
            </Button>
          }
        >
          <p>{exportError}</p>
        </Modal>
      )}
      {exporting === "pdf" && (
        <p className="export-range-notice" role="status">
          Rekap PDF sedang disiapkan. Foto diproses bertahap; mohon tunggu dan
          biarkan halaman ini tetap terbuka.
        </p>
      )}
      <StatCards
        isLive={isLive}
        isSingleDay={isSingleDay}
        counts={counts}
        active={statFilter}
        onSelect={setStatFilter}
      />

      <div className="monitoring__body">
        <section className="monitoring__list">
          <div className="monitoring__list-head">
            <h2>
              {periodLabel} ({rows.length})
            </h2>
            <input
              type="search"
              className="control"
              placeholder="Cari nama pegawai"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {employeesError && (
            <p className="text-error" role="alert">
              {employeesError}
            </p>
          )}
          {attendances.error && (
            <p className="text-error">{attendances.error}</p>
          )}
          <AttendanceTable
            rows={rows}
            isLive={isLive}
            selectedKey={selectedKey}
            onSelect={selectRow}
          />
        </section>

        <section className="monitoring__side">
          <AttendanceMap
            ref={mapRef}
            rows={rows}
            selectedKey={selectedKey}
            caption={`${locatedCount} lokasi absen · ${periodLabel}`}
            onSelect={selectRow}
          />
          {selectedRow ? (
            <AttendanceDetail
              onClose={() => setSelectedKey(null)}
              row={selectedRow}
              totalSessions={TOTAL_SESSIONS}
              showDate={!isSingleDay}
              onZoomToLocation={(location) => mapRef.current?.flyTo(location)}
              onOpenPhoto={(url, title) => setLightbox({ url, title })}
            />
          ) : (
            <div className="detail detail--empty">
              Klik nama pegawai untuk melihat selfie dan lokasinya di peta.
            </div>
          )}
        </section>
      </div>

      {toast && <Toast message={toast} />}
      {lightbox && (
        <PhotoLightbox {...lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

const toCustom = ({ from, to }: { from: string; to: string }) => ({
  customFrom: from,
  customTo: to,
});
