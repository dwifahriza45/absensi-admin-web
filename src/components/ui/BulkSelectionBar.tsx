import { Button } from "./Button";
export function BulkSelectionBar({
  count,
  busy,
  onClear,
  onDelete,
}: {
  count: number;
  busy: boolean;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (!count) return null;
  return (
    <div
      className="bulk-selection-bar"
      role="region"
      aria-label="Data terpilih"
    >
      <strong>{count} data dipilih</strong>
      <span>Pilihan dapat mencakup beberapa halaman.</span>
      <div>
        <Button className="btn--small" disabled={busy} onClick={onClear}>
          Batalkan pilihan
        </Button>
        <Button
          className="btn--small"
          variant="danger"
          disabled={busy}
          onClick={onDelete}
        >
          Hapus terpilih ({count})
        </Button>
      </div>
    </div>
  );
}
