import type { StatFilter } from "@/utils/attendanceRows";

interface StatCardsProps {
  isLive: boolean;
  isSingleDay: boolean;
  counts: Record<StatFilter, number>;
  active: StatFilter | null;
  onSelect: (filter: StatFilter | null) => void;
}

export function StatCards({
  isLive,
  isSingleDay,
  counts,
  active,
  onSelect,
}: StatCardsProps) {
  const cards: { key: StatFilter; label: string; tone: string }[] = isLive
    ? [
        { key: "hadir", label: "Sudah absen", tone: "navy" },
        { key: "bekerja", label: "Sedang bekerja", tone: "navy" },
        { key: "tinjau", label: "Perlu ditinjau", tone: "amber" },
        { key: "pulang", label: "Sudah pulang", tone: "grey" },
        { key: "belum", label: "Belum absen", tone: "muted" },
      ]
    : [
        { key: "hadir", label: "Total absen", tone: "navy" },
        { key: "pulang", label: "Lengkap (masuk & pulang)", tone: "grey" },
        { key: "tanpaPulang", label: "Tanpa absen pulang", tone: "red" },
        { key: "tinjau", label: "Perlu ditinjau", tone: "amber" },
        {
          key: "belum",
          label: isSingleDay ? "Tidak absen" : "Hari tanpa absen",
          tone: "muted",
        },
      ];

  return (
    <div className="stat-cards">
      {cards.map((card) => {
        const selected = active === card.key;
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={selected}
            className={`stat-card ${selected ? "stat-card--active" : ""}`}
            onClick={() => onSelect(selected ? null : card.key)}
          >
            <strong
              className={`stat-card__value stat-card__value--${card.tone}`}
            >
              {counts[card.key]}
            </strong>
            <span>{card.label}</span>
          </button>
        );
      })}
    </div>
  );
}
