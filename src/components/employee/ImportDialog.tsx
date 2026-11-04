import { useRef, useState } from "react";
import { ImportTemplateDownload } from "@/components/ui/ImportTemplateDownload";
import { ApiError } from "@/api/client";
import { employeeApi } from "@/api/employee.api";
import { Button, Modal } from "@/components/ui";
import type { ImportResult, ImportRow } from "@/types";
import { downloadEmployeeTemplate, readEmployeeFile } from "@/utils/excel";

interface ImportDialogProps {
  onClose: () => void;
  onImported: (result: ImportResult) => void;
}

/** Import data pegawai dari Excel: pilih file → pratinjau → simpan. Validasi akhir di server. */
export function ImportDialog({ onClose, onImported }: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [deactivateMissing, setDeactivateMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setResult(null);
    if (file.size > 4 * 1024 * 1024) {
      setRows([]);
      setError("Ukuran file maksimal 4 MiB.");
      return;
    }
    setFileName(file.name);
    try {
      const parsed = await readEmployeeFile(file);
      setRows(parsed);
      if (!parsed.length)
        setError("File kosong atau kolom Nama/NIK tidak ditemukan.");
    } catch (err) {
      setRows([]);
      setError(
        err instanceof Error
          ? err.message
          : "File tidak bisa dibaca. Pakai format .xlsx dari template.",
      );
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const imported = await employeeApi.import(rows, deactivateMissing);
      setResult(imported);
      onImported(imported);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal menyimpan data pegawai.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Import Data Pegawai"
      size="wide"
      footer={
        <>
          <Button disabled={saving} onClick={onClose}>
            {result ? "Tutup" : "Batal"}
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!rows.length || !!result}
            onClick={() => void save()}
          >
            Simpan {rows.length} pegawai
          </Button>
        </>
      }
    >
      <p className="text-muted">
        Kolom Excel: <strong>Nama Lengkap, Mitra, Bidang, NIK</strong>. Format
        template import sama dengan hasil export. NIK wajib 16 digit dan unik;
        isi kolom NIK sebagai teks di Excel. Gunakan hasil export untuk
        memperbarui data karyawan, termasuk karyawan lama yang belum memiliki
        NIK. Untuk karyawan baru, isi baris baru pada template; NIK yang sudah
        terdaftar akan diperbarui.
      </p>
      <ImportTemplateDownload
        disabled={saving}
        onDownload={() =>
          void downloadEmployeeTemplate().catch(() =>
            setError("Gagal mengunduh template."),
          )
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        disabled={saving}
        hidden
        onChange={(event) => {
          void pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button disabled={saving} onClick={() => fileRef.current?.click()}>
        {fileName ? `Ganti file (${fileName})` : "Pilih file Excel"}
      </Button>

      {rows.length > 0 && (
        <div className="import-preview">
          {rows.slice(0, 200).map((row, index) => (
            <div key={index} className="import-preview__row">
              <strong>{row.name || "(tanpa nama)"}</strong>
              <span>
                {[row.nik, row.mitra, row.bidang].filter(Boolean).join(" · ") ||
                  "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      <label className="checkbox">
        <input
          type="checkbox"
          disabled={saving || !!result}
          checked={deactivateMissing}
          onChange={(e) => setDeactivateMissing(e.target.checked)}
        />
        Nonaktifkan pegawai yang tidak ada di file ini
      </label>
      {result && (
        <div className="import-results">
          <div className="import-counts">
            <span>
              <b>{result.created}</b> Baru
            </span>
            <span>
              <b>{result.updated}</b> Diperbarui
            </span>
            <span>
              <b>{result.skipped.length}</b> Dilewati
            </span>
          </div>
          {result.deactivated > 0 && (
            <p>{result.deactivated} karyawan dinonaktifkan.</p>
          )}
          {result.skipped.length > 0 && (
            <div className="import-preview">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Baris</th>
                    <th>Nama</th>
                    <th>Alasan dilewati</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((row) => (
                    <tr key={row.row}>
                      <td>{row.row}</td>
                      <td>{row.name}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="text-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
