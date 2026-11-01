import { useState } from "react";
import { ImportTemplateDownload } from "@/components/ui/ImportTemplateDownload";
import { masterApi } from "@/api/master.api";
import { Button, Field, Modal } from "@/components/ui";
import { ErrorNotice } from "@/components/ui/DataFeedback";
import type { MasterImportResult, MasterKind } from "@/types";

export function MasterImportDialog({
  kind,
  onClose,
  onImported,
}: {
  kind: MasterKind;
  onClose: () => void;
  onImported: () => void;
}) {
  const label = kind === "mitra" ? "Mitra" : "Bidang";
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MasterImportResult | null>(null);
  const [status, setStatus] = useState("all");
  const api = masterApi(kind);
  const pick = (next?: File) => {
    setError(null);
    setFile(null);
    setResult(null);
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".xlsx")) {
      setError("Pilih file Excel .xlsx.");
      return;
    }
    if (next.size > 8 * 1024 * 1024) {
      setError("Ukuran file maksimal 8 MiB.");
      return;
    }
    setFile(next);
  };
  const run = async (template = false) => {
    setBusy(true);
    setError(null);
    try {
      if (template) await api.template();
      else if (file) {
        setResult(await api.import(file));
        onImported();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import gagal.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Import ${label}`}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            {result ? "Tutup" : "Batal"}
          </Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!file || !!result}
            onClick={() => void run()}
          >
            Import file
          </Button>
        </>
      }
    >
      <p className="text-muted">
        Gunakan satu kolom <strong>NAMA {label.toUpperCase()}</strong> pada
        sheet {label}. Nama yang sudah terdaftar dilewati. Maksimal 5.000 baris
        / 8 MiB.
      </p>
      <ImportTemplateDownload
        disabled={busy}
        onDownload={() => void run(true)}
      />
      <label className="file-picker">
        <strong>{file?.name ?? "Pilih file Excel"}</strong>
        <span>Format .xlsx</span>
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <ErrorNotice message={error} />
      {result && (
        <div className="import-results">
          <div className="import-counts">
            <span>
              <b>{result.success}</b> Berhasil
            </span>
            <span>
              <b>{result.skip}</b> Dilewati
            </span>
            <span>
              <b>{result.error}</b> Error
            </span>
          </div>
          <Field label="HASIL PER BARIS">
            <select
              className="control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">Semua ({result.total})</option>
              <option value="success">Berhasil</option>
              <option value="skip">Dilewati</option>
              <option value="error">Error</option>
            </select>
          </Field>
          <div className="import-preview">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Baris</th>
                  <th>Nama</th>
                  <th>Hasil</th>
                </tr>
              </thead>
              <tbody>
                {result.rows
                  .filter((row) => status === "all" || row.status === status)
                  .map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>{row.name || "—"}</td>
                      <td>
                        <span
                          className={`result-status result-status--${row.status}`}
                        >
                          {row.status}
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
