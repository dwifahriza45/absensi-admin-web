// Utilitas tanggal. Server memakai format YYYY-MM-DD.

export type PeriodKey =
  "today" | "yesterday" | "7d" | "month" | "lastMonth" | "custom";

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "7d", label: "7 hari terakhir" },
  { value: "month", label: "Bulan ini" },
  { value: "lastMonth", label: "Bulan lalu" },
  { value: "custom", label: "Pilih tanggal" },
];

export const MAX_RANGE_DAYS = 31;
export const MONTH_RANGE_MESSAGE =
  "Pengambilan data dibatasi maksimal 1 bulan. Silakan sesuaikan rentang tanggal pada filter.";
export function attendanceRangeError(from: string, to: string): string | null {
  const a = Date.parse(`${from}T00:00:00Z`),
    b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a)
    return "Rentang tanggal tidak valid. Silakan periksa kembali filter tanggal.";
  return (b - a) / 86400000 + 1 > MAX_RANGE_DAYS ? MONTH_RANGE_MESSAGE : null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const fromIso = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const todayIso = () => toIso(new Date());

const addDays = (date: Date, days: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

/** Mengubah pilihan periode menjadi rentang tanggal [from, to]. */
export function rangeOf(
  period: PeriodKey,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const today = fromIso(todayIso());
  switch (period) {
    case "yesterday": {
      const day = toIso(addDays(today, -1));
      return { from: day, to: day };
    }
    case "7d":
      return { from: toIso(addDays(today, -6)), to: toIso(today) };
    case "month":
      return {
        from: toIso(new Date(today.getFullYear(), today.getMonth(), 1)),
        to: toIso(today),
      };
    case "lastMonth":
      return {
        from: toIso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: toIso(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case "custom": {
      if (!customFrom) return { from: toIso(today), to: toIso(today) };
      const to = customTo || customFrom;
      return customFrom <= to
        ? { from: customFrom, to }
        : { from: to, to: customFrom };
    }
    default:
      return { from: toIso(today), to: toIso(today) };
  }
}

/** Semua tanggal di antara from dan to (termasuk keduanya), maksimal 31 hari. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (
    let d = fromIso(from);
    d <= fromIso(to) && days.length < MAX_RANGE_DAYS;
    d = addDays(d, 1)
  ) {
    days.push(toIso(d));
  }
  return days;
}

/** Rentang satu bulan dari input "YYYY-MM". Bulan berjalan dipotong sampai hari ini. */
export function monthRange(month: string): { from: string; to: string } {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(year, m, 0);
  const today = fromIso(todayIso());
  return {
    from: toIso(new Date(year, m - 1, 1)),
    to: toIso(last > today ? today : last),
  };
}

export const formatDayShort = (iso: string) =>
  fromIso(iso).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

export const formatDayLong = () =>
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
