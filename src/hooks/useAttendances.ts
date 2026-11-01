import { useCallback, useEffect, useRef, useState } from "react";
import { attendanceApi } from "@/api/attendance.api";
import { ApiError } from "@/api/client";
import type { AdminAttendance, AttendanceFilter } from "@/types";
import { formatTime, todayIso } from "@/utils/date";

const POLL_MS = 1500;

/**
 * Mengambil data absen sesuai filter.
 * Bila rentang mencakup hari ini, server dicek tiap 1,5 detik (ringan) dan data lengkap
 * hanya diambil ulang saat ada perubahan. Perubahan baru dikirim sebagai `event` untuk notifikasi.
 */
export function useAttendances(filter: AttendanceFilter) {
  const [records, setRecords] = useState<AdminAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [event, setEvent] = useState<string | null>(null);

  const sequence = useRef(0);
  const lastVersion = useRef<number | null>(null);
  const previous = useRef<Map<string, AdminAttendance> | null>(null);
  const includesToday = filter.from <= todayIso() && todayIso() <= filter.to;

  const load = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const list = await attendanceApi.list(filter);
      if (current !== sequence.current) return; // filter sudah berganti
      setEvent(describeChanges(previous.current, list));
      previous.current = new Map(list.map((r) => [r.id, r]));
      setRecords(list);
      setUpdatedAt(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal memuat data absen.",
      );
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [filter]);

  // Muat ulang saat filter berubah.
  useEffect(() => {
    previous.current = null;
    lastVersion.current = null;
    setLoading(true);
    void load();
  }, [load]);

  // Cek perubahan berkala hanya untuk periode yang mencakup hari ini.
  useEffect(() => {
    if (!includesToday) return;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const { version } = await attendanceApi.version(todayIso());
        if (lastVersion.current !== null && version !== lastVersion.current)
          void load();
        lastVersion.current = version;
        setUpdatedAt(new Date());
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [includesToday, load]);

  const clearEvent = useCallback(() => setEvent(null), []);
  return {
    records,
    loading,
    error,
    updatedAt,
    event,
    reload: load,
    clearEvent,
  };
}

function describeChanges(
  before: Map<string, AdminAttendance> | null,
  after: AdminAttendance[],
): string | null {
  if (!before) return null; // muatan pertama tidak dianggap kejadian baru
  const messages: string[] = [];
  for (const record of after) {
    const old = before.get(record.id);
    const name = record.employee.name;
    if (!old)
      messages.push(
        `${name} absen masuk pukul ${formatTime(record.checkInAt)}`,
      );
    else {
      if (record.checkOutAt && !old.checkOutAt)
        messages.push(
          `${name} absen pulang pukul ${formatTime(record.checkOutAt)}`,
        );
      if (record.sessions.length > old.sessions.length) {
        const newest = record.sessions[record.sessions.length - 1];
        messages.push(`${name} mengirim hasil Sesi ${newest.no}`);
      }
    }
  }
  return messages.length ? messages.join(" · ") : null;
}
