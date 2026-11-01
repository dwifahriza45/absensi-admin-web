import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/api/client";
import { Button } from "./Button";
import { Modal } from "./Modal";

export interface BulkDeleteItem {
  id: string;
  name: string;
}
interface RowResult extends BulkDeleteItem {
  status: "success" | "skipped" | "error";
  message: string;
}
export function BulkDeleteDialog({
  items,
  label,
  onDelete,
  onClose,
  onCompleted,
  onBusyChange,
}: {
  items: BulkDeleteItem[];
  label: string;
  onDelete: (id: string) => Promise<unknown>;
  onClose: () => void;
  onCompleted: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (running) progressRef.current?.focus();
  }, [running]);
  const run = async () => {
    if (running || results) return;
    setRunning(true);
    onBusyChange(true);
    const rows: RowResult[] = [];
    try {
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
          await onDelete(item.id);
          rows.push({
            ...item,
            status: "success",
            message: "Berhasil dihapus.",
          });
        } catch (error) {
          const expected =
            error instanceof ApiError &&
            (error.status === 409 || error.status === 404);
          const message =
            error instanceof Error ? error.message : "Gagal menghapus data.";
          rows.push({
            ...item,
            status: expected ? "skipped" : "error",
            message,
          });
          // Stop on network/auth/server errors; do not issue hundreds of failing requests.
          if (!expected) {
            for (const pending of items.slice(index + 1))
              rows.push({
                ...pending,
                status: "skipped",
                message:
                  "Belum diproses karena terjadi kendala. Muat ulang data sebelum mencoba kembali.",
              });
            break;
          }
        }
        setProgress(index + 1);
      }
      setResults(rows);
      onCompleted();
    } finally {
      setRunning(false);
      onBusyChange(false);
    }
  };
  const success =
    results?.filter((row) => row.status === "success").length ?? 0;
  const skipped =
    results?.filter((row) => row.status === "skipped").length ?? 0;
  const failed = results?.filter((row) => row.status === "error").length ?? 0;
  return (
    <Modal
      title={
        results
          ? `Hasil penghapusan ${label}`
          : `Hapus ${items.length} ${label} terpilih?`
      }
      footer={
        results ? (
          <Button className="bulk-delete__close" onClick={onClose}>
            Tutup
          </Button>
        ) : (
          <>
            <Button disabled={running} onClick={onClose}>
              Batal
            </Button>
            <Button
              variant="danger"
              loading={running}
              onClick={() => void run()}
            >
              Hapus {items.length} data
            </Button>
          </>
        )
      }
    >
      {!results && (
        <>
          <p className="text-muted">
            Data terpilih akan dihapus permanen. Data yang memiliki relasi tetap
            dilindungi oleh sistem.
          </p>
          <div className="bulk-delete__list">
            {items.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        </>
      )}
      {running && (
        <div
          ref={progressRef}
          tabIndex={0}
          role="status"
          className="bulk-delete__progress"
        >
          Menghapus data {Math.min(progress + 1, items.length)} dari{" "}
          {items.length}…
        </div>
      )}
      {results && (
        <div className="import-results">
          <div className="import-counts">
            <span>
              <b>{success}</b> Berhasil
            </span>
            <span>
              <b>{skipped}</b> Dilewati
            </span>
            <span>
              <b>{failed}</b> Gagal
            </span>
          </div>
          <div className="import-preview">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>
                      <span
                        className={`result-status result-status--${row.status === "skipped" ? "skip" : row.status}`}
                      >
                        {row.status === "success"
                          ? "Berhasil"
                          : row.status === "skipped"
                            ? "Dilewati"
                            : "Gagal"}
                      </span>
                      <small>{row.message}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
