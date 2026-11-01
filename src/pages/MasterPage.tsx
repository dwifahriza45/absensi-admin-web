import { useBulkSelection } from "@/hooks/useBulkSelection";
import { SelectionCheckbox } from "@/components/ui/SelectionCheckbox";
import { BulkSelectionBar } from "@/components/ui/BulkSelectionBar";
import {
  BulkDeleteDialog,
  type BulkDeleteItem,
} from "@/components/ui/BulkDeleteDialog";
import { TransferIcon } from "@/components/ui/TransferIcon";
import { ActionButton } from "@/components/ui/ActionButton";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { ApiError } from "@/api/client";
import { masterApi, masterId } from "@/api/master.api";
import { MasterImportDialog } from "@/components/master/MasterImportDialog";
import { Button, Field, Modal, Toast } from "@/components/ui";
import { ErrorNotice, Pagination } from "@/components/ui/DataFeedback";
import { useData } from "@/hooks/useData";
import type { MasterItem, MasterKind } from "@/types";

export function MasterPage({ kind }: { kind: MasterKind }) {
  const label = kind === "mitra" ? "Mitra" : "Bidang";
  const api = useMemo(() => masterApi(kind), [kind]);
  const load = useCallback(() => api.list(), [api]);
  const { data, loading, error, reload } = useData(load);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [form, setForm] = useState<{ item?: MasterItem; name: string } | null>(
    null,
  );
  const [detail, setDetail] = useState<MasterItem | null>(null);
  const [deleting, setDeleting] = useState<MasterItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState("");
  const [toast, setToast] = useState("");
  const [bulkTargets, setBulkTargets] = useState<BulkDeleteItem[] | null>(null);
  const items = (data ?? []).filter((item) =>
    item.name
      .toLocaleLowerCase("id-ID")
      .includes(query.trim().toLocaleLowerCase("id-ID")),
  );
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const pageItems = items.slice((current - 1) * size, current * size);
  const selection = useBulkSelection(
    items,
    (item) => masterId(kind, item),
    `${kind}:${query}`,
  );
  const pageSelection = selection.pageState(pageItems);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  };
  const open = async (item: MasterItem, edit = false) => {
    setBusy(true);
    setActionError(null);
    setFieldError("");
    try {
      const fresh = await api.detail(masterId(kind, item));
      if (edit) setForm({ item: fresh, name: fresh.name });
      else setDetail(fresh);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal memuat detail.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setActionError(null);
    setFieldError("");
    try {
      if (form.item) await api.update(masterId(kind, form.item), form.name);
      else await api.create(form.name);
      setForm(null);
      notify(`${label} berhasil disimpan.`);
      void reload();
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.valid.name
          ? null
          : err instanceof Error
            ? err.message
            : "Gagal menyimpan.",
      );
      if (err instanceof ApiError) setFieldError(err.valid.name ?? "");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setActionError(null);
    try {
      await api.remove(masterId(kind, deleting));
      setDeleting(null);
      notify(`${label} berhasil dihapus.`);
      void reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menghapus.");
      if (err instanceof ApiError && err.status === 409) {
        setDeleting({
          ...deleting,
          can_delete: false,
          delete_reason: err.message,
        });
        void reload();
      }
    } finally {
      setBusy(false);
    }
  };
  const exportFile = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api.export(query.trim());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal export.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="management">
      <div className="management__heading">
        <div>
          <span className="eyebrow">DATA MASTER</span>
          <h1>Data {label}</h1>
          <p>Kelola daftar {label.toLowerCase()} untuk penempatan karyawan.</p>
        </div>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => {
            setActionError(null);
            setFieldError("");
            setForm({ name: "" });
          }}
        >
          + Tambah {label}
        </Button>
      </div>
      <section className="data-panel">
        <div className="data-toolbar">
          <input
            type="search"
            className="control"
            placeholder={`Cari nama ${label.toLowerCase()}…`}
            aria-label={`Cari ${label}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <div>
            <Button
              icon={<TransferIcon direction="upload" />}
              disabled={busy}
              onClick={() => {
                setActionError(null);
                setImportOpen(true);
              }}
            >
              Import Excel
            </Button>
            <Button
              icon={<TransferIcon direction="download" />}
              disabled={busy || loading}
              onClick={() => void exportFile()}
            >
              Export Excel
            </Button>
            <ActionButton
              action="refresh"
              loading={loading}
              disabled={loading}
              onClick={() => void reload()}
            />
          </div>
        </div>
        <ErrorNotice message={error} retry={() => void reload()} />
        {!form && !deleting && <ErrorNotice message={actionError} />}
        <BulkSelectionBar
          count={selection.selected.length}
          busy={busy || loading || !!error}
          onClear={selection.clear}
          onDelete={() =>
            setBulkTargets(
              selection.selected.map((item) => ({
                id: masterId(kind, item),
                name: item.name,
              })),
            )
          }
        />
        <div className="data-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="selection-cell">
                  <SelectionCheckbox
                    label="Pilih semua yang dapat dihapus di halaman ini"
                    checked={pageSelection.checked}
                    indeterminate={pageSelection.indeterminate}
                    disabled={busy || loading || pageSelection.disabled}
                    reason={
                      pageSelection.disabled && !loading
                        ? "Tidak ada data yang dapat dihapus di halaman ini."
                        : undefined
                    }
                    onChange={(checked) =>
                      selection.togglePage(pageItems, checked)
                    }
                  />
                </th>
                <th>No.</th>
                <th>Nama {label}</th>
                <th className="actions-cell">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="empty-state">
                    Memuat data {label.toLowerCase()}…
                  </td>
                </tr>
              ) : items.length ? (
                pageItems.map((item, index) => (
                  <tr key={masterId(kind, item)}>
                    <td className="selection-cell">
                      <SelectionCheckbox
                        label={`Pilih ${item.name}`}
                        checked={selection.selectedIds.has(
                          masterId(kind, item),
                        )}
                        disabled={busy || item.can_delete !== true}
                        reason={
                          item.can_delete !== true
                            ? item.delete_reason ||
                              (item.can_delete === false
                                ? `${label} masih dipakai karyawan dan tidak dapat dihapus.`
                                : "Muat ulang data untuk memeriksa apakah data dapat dihapus.")
                            : undefined
                        }
                        onChange={(checked) =>
                          selection.toggle(masterId(kind, item), checked)
                        }
                      />
                    </td>
                    <td className="row-number">
                      {(current - 1) * size + index + 1}
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td className="actions-cell">
                      <ActionButton
                        action="detail"
                        disabled={busy}
                        onClick={() => void open(item)}
                      />
                      <ActionButton
                        action="edit"
                        disabled={busy}
                        onClick={() => void open(item, true)}
                      />
                      <ActionButton
                        action="delete"
                        disabled={busy || item.can_delete === false}
                        disabledReason={
                          item.can_delete === false
                            ? item.delete_reason ||
                              `${label} masih dipakai karyawan dan tidak dapat dihapus.`
                            : undefined
                        }
                        onClick={() => {
                          setActionError(null);
                          setDeleting(item);
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    {query
                      ? "Tidak ada data yang sesuai pencarian."
                      : `Belum ada ${label.toLowerCase()}. Tambahkan data atau import dari Excel.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={current}
          pages={pages}
          total={items.length}
          size={size}
          onPage={setPage}
          onSize={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
      </section>
      {form && (
        <Modal
          title={`${form.item ? "Ubah" : "Tambah"} ${label}`}
          footer={
            <>
              <Button
                disabled={busy}
                onClick={() => {
                  setForm(null);
                  setActionError(null);
                  setFieldError("");
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="master-form"
                variant="primary"
                loading={busy}
              >
                Simpan
              </Button>
            </>
          }
        >
          <form
            id="master-form"
            className="data-form"
            onSubmit={save}
            noValidate
          >
            <Field label={`NAMA ${label.toUpperCase()}`}>
              <input
                className="control"
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={!!fieldError}
              />
              {fieldError && <small className="text-error">{fieldError}</small>}
            </Field>
            <ErrorNotice message={actionError} />
          </form>
        </Modal>
      )}
      {detail && (
        <Modal
          title={`Detail ${label}`}
          footer={
            <>
              <Button onClick={() => setDetail(null)}>Tutup</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setForm({ item: detail, name: detail.name });
                  setDetail(null);
                  setActionError(null);
                }}
              >
                Ubah
              </Button>
            </>
          }
        >
          <dl className="detail-list">
            <dt>Nama {label}</dt>
            <dd>{detail.name}</dd>
          </dl>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Hapus ${label}`}
          footer={
            <>
              <Button
                disabled={busy}
                onClick={() => {
                  setDeleting(null);
                  setActionError(null);
                }}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                disabled={deleting.can_delete === false}
                loading={busy}
                onClick={() => void remove()}
              >
                Hapus
              </Button>
            </>
          }
        >
          <p>
            Hapus <strong>{deleting.name}</strong>? {label} yang masih dipakai
            karyawan tidak dapat dihapus.
          </p>
          <ErrorNotice message={actionError} />
        </Modal>
      )}
      {importOpen && (
        <MasterImportDialog
          kind={kind}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            void reload();
          }}
        />
      )}
      {bulkTargets && (
        <BulkDeleteDialog
          items={bulkTargets}
          label={label.toLowerCase()}
          onDelete={api.remove}
          onClose={() => setBulkTargets(null)}
          onCompleted={() => {
            selection.clear();
            void reload();
          }}
          onBusyChange={setBusy}
        />
      )}
      {toast && <Toast message={toast} />}
    </main>
  );
}
