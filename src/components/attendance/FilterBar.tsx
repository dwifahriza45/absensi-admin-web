import { PdfIcon } from "@/components/ui/PdfIcon";
import { TransferIcon } from "@/components/ui/TransferIcon";
import { Button, Field, Select } from "@/components/ui";
import type { FilterOptions } from "@/types";
import { PERIOD_OPTIONS, todayIso, type PeriodKey } from "@/utils/date";

export interface FilterState {
  period: PeriodKey;
  customFrom: string;
  customTo: string;
  mitra: string;

  bidang: string;
}

export const INITIAL_FILTER: FilterState = {
  period: "today",
  customFrom: "",
  customTo: "",
  mitra: "",

  bidang: "",
};

interface FilterBarProps {
  value: FilterState;
  range: { from: string; to: string };
  options: FilterOptions;
  onChange: (patch: Partial<FilterState>) => void;
  onMonth: (month: string) => void;
  onReset: () => void;
  onExport: () => void;
  onRecap: () => void;
  exporting?: "excel" | "pdf" | null;
  exportDisabled?: boolean;
  hasExtraFilters?: boolean;
}

const withAll = (values: string[]) => [
  { value: "", label: "Semua" },
  ...values.map((v) => ({ value: v, label: v })),
];

export function FilterBar({
  value,
  range,
  options,
  onChange,
  onMonth,
  onReset,
  onExport,
  onRecap,
  exporting = null,
  exportDisabled = false,
  hasExtraFilters = false,
}: FilterBarProps) {
  const today = todayIso();
  const sameMonth = range.from.slice(0, 7) === range.to.slice(0, 7);
  const isFiltered =
    value.period !== "today" || value.mitra || value.bidang || hasExtraFilters;

  return (
    <div className="filter-bar">
      <Select
        label="PERIODE"
        value={value.period}
        options={PERIOD_OPTIONS}
        onChange={(period) =>
          onChange(
            period === "custom"
              ? { period: "custom", customFrom: range.from, customTo: range.to }
              : { period: period as PeriodKey },
          )
        }
      />
      <Field label="DARI TANGGAL">
        <input
          type="date"
          className="control"
          value={range.from}
          max={today}
          onChange={(e) =>
            e.target.value &&
            onChange({
              period: "custom",
              customFrom: e.target.value,
              customTo: range.to,
            })
          }
        />
      </Field>
      <Field label="SAMPAI">
        <input
          type="date"
          className="control"
          value={range.to}
          max={today}
          onChange={(e) =>
            e.target.value &&
            onChange({
              period: "custom",
              customFrom: range.from,
              customTo: e.target.value,
            })
          }
        />
      </Field>
      <Field label="BULAN">
        <input
          type="month"
          className="control"
          value={sameMonth ? range.from.slice(0, 7) : ""}
          max={today.slice(0, 7)}
          onChange={(e) => e.target.value && onMonth(e.target.value)}
        />
      </Field>
      <Select
        label="MITRA"
        value={value.mitra}
        options={withAll(options.mitra)}
        onChange={(v) => onChange({ mitra: v })}
      />
      <Select
        label="BIDANG"
        value={value.bidang}
        options={withAll(options.bidang)}
        onChange={(v) => onChange({ bidang: v })}
      />

      <div className="filter-bar__actions">
        {isFiltered && (
          <Button
            className="filter-reset"
            onClick={onReset}
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
                <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
              </svg>
            }
          >
            Reset filter
          </Button>
        )}
        <Button
          variant="primary"
          icon={<TransferIcon direction="download" />}
          onClick={onExport}
          loading={exporting === "excel"}
          disabled={exportDisabled || !!exporting}
        >
          Export Excel
        </Button>
        <Button
          icon={<PdfIcon />}
          onClick={onRecap}
          loading={exporting === "pdf"}
          disabled={exportDisabled || !!exporting}
        >
          Rekap
        </Button>
      </div>
    </div>
  );
}
