import { useBulkSelection } from "@/hooks/useBulkSelection";
import { SelectionCheckbox } from "@/components/ui/SelectionCheckbox";
import { BulkSelectionBar } from "@/components/ui/BulkSelectionBar";
import {
  BulkDeleteDialog,
  type BulkDeleteItem,
} from "@/components/ui/BulkDeleteDialog";
import { ApiError } from "@/api/client";
import { TransferIcon } from "@/components/ui/TransferIcon";
import { ActionButton } from "@/components/ui/ActionButton";
import { useCallback, useState } from "react";
import { employeeApi } from "@/api/employee.api";
import { masterApi } from "@/api/master.api";
import { EmployeeForm } from "@/components/employee/EmployeeForm";
import { ImportDialog } from "@/components/employee/ImportDialog";
import { Button, Field, Modal, Toast } from "@/components/ui";
import { ErrorNotice, Pagination } from "@/components/ui/DataFeedback";
import { useData } from "@/hooks/useData";
import type { Employee } from "@/types";

export function EmployeesPage() {
  const load = useCallback(async () => {
    const [employees, institutions, divisions] = await Promise.all([
      employeeApi.list({ includeInactive: "true" }),
      masterApi("mitra").list(),
      masterApi("bidang").list(),
    ]);
    return { employees, institutions, divisions };
  }, []);
  const { data, loading, error, reload } = useData(load);
  const [query, setQuery] = useState("");
  const [institution, setInstitution] = useState("");
  const [division, setDivision] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [form, setForm] = useState<{ employee?: Employee } | null>(null);
  const [detail, setDetail] = useState<Employee | null>(null);
  const [statusTarget, setStatusTarget] = useState<Employee | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [bulkTargets, setBulkTargets] = useState<BulkDeleteItem[] | null>(null);
  const employees = data?.employees ?? [];
  const needle = query.trim().toLocaleLowerCase("id-ID");
  const items = employees.filter(
    (item) =>
      (!needle ||
        `${item.name} ${item.nik ?? ""}`
          .toLocaleLowerCase("id-ID")
          .includes(needle)) &&
      (!institution || item.mitra_id === institution) &&
      (!division || item.bidang_id === division) &&
      (status === "all" || item.isActive === (status === "active")),
  );
  const hasFilters = Boolean(
    query.trim() || institution || division || status !== "active",
  );
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const pageItems = items.slice((current - 1) * size, current * size);
  const selection = useBulkSelection(
    items,
    (item) => item.employee_id,
    JSON.stringify([query, institution, division, status]),
  );
  const pageSelection = selection.pageState(pageItems);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 5000);
  };
  const open = async (item: Employee, edit = false) => {
    setBusy(true);
    setActionError(null);
    try {
      const fresh = await employeeApi.detail(item.employee_id);
      if (edit) setForm({ employee: fresh });
      else setDetail(fresh);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal memuat detail.",
      );
    } finally {
      setBusy(false);
    }
  };
  const exportFile = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await employeeApi.export({
        q: query.trim(),
        mitra_id: institution,
        bidang_id: division,
        status,
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal export karyawan.",
      );
    } finally {
      setBusy(false);
    }
  };
  const changeStatus = async () => {
    if (!statusTarget) return;
    setBusy(true);
    setStatusError(null);
    try {
      await employeeApi.setStatus(
        statusTarget.employee_id,
        !statusTarget.isActive,
      );
      notify(
        statusTarget.isActive
          ? "Karyawan berhasil dinonaktifkan."
          : "Karyawan berhasil diaktifkan.",
      );
      setStatusTarget(null);
      void reload();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Gagal mengubah status.",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setActionError(null);
    try {
      await employeeApi.remove(deleting.employee_id);
      setDeleting(null);
      notify("Data karyawan berhasil dihapus.");
      void reload();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal menghapus karyawan.",
      );
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
  return (
    <main className="management">
      <div className="management__heading">
        <div>
          <span className="eyebrow">DATA KARYAWAN</span>
          <h1>Data Karyawan</h1>
          <p>Kelola identitas dan penempatan karyawan.</p>
        </div>
        <Button
          variant="primary"
          disabled={loading || busy || !data}
          onClick={() => setForm({})}
        >
          + Tambah Karyawan
        </Button>
      </div>
      <div className="management-stats" aria-label="Filter ringkasan karyawan">
        {[
          { value: "all", label: "Total karyawan", count: employees.length },
          {
            value: "active",
            label: "Karyawan aktif",
            count: employees.filter((item) => item.isActive).length,
          },
          {
            value: "inactive",
            label: "Karyawan nonaktif",
            count: employees.filter((item) => !item.isActive).length,
          },
        ].map((card) => (
          <button
            key={card.value}
            type="button"
            aria-label={card.label}
            aria-pressed={status === card.value}
            disabled={loading}
            onClick={() => {
              setStatus(card.value);
              setPage(1);
            }}
          >
            <strong>{card.count}</strong>
            {card.label}
          </button>
        ))}
      </div>
      <section className="data-panel">
        <div className="data-toolbar employee-toolbar">
          <div className="employee-toolbar__title">
            <h2>Daftar karyawan</h2>
            <span className="employee-toolbar__count">
              {loading ? "Memuat…" : `${items.length} data`}
            </span>
          </div>
          <div>
            <Button
              icon={<TransferIcon direction="upload" />}
              disabled={busy}
              onClick={() => setImportOpen(true)}
            >
              Import Excel
            </Button>
            <Button
              icon={<TransferIcon direction="download" />}
              disabled={busy || loading || !!error}
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
        <div className="employee-filterbar">
          <Field label="PENCARIAN">
            {" "}
            <input
              className="control control--search"
              type="search"
              aria-label="Cari karyawan"
              placeholder="Cari nama atau NIK…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </Field>
          <Field label="MITRA">
            <select
              className="control"
              aria-label="Filter mitra"
              value={institution}
              onChange={(e) => {
                setInstitution(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua mitra</option>
              {data?.institutions.map((item) => (
                <option key={item.mitra_id} value={item.mitra_id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="BIDANG">
            <select
              className="control"
              aria-label="Filter bidang"
              value={division}
              onChange={(e) => {
                setDivision(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua bidang</option>
              {data?.divisions.map((item) => (
                <option key={item.bidang_id} value={item.bidang_id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="STATUS">
            <select
              className="control"
              aria-label="Filter status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="active">Karyawan aktif</option>
              <option value="inactive">Karyawan nonaktif</option>
              <option value="all">Semua status</option>
            </select>
          </Field>
        </div>
        <div className="employee-filter-summary">
          <span>
            Menampilkan <strong>{items.length}</strong> karyawan
          </span>
          {hasFilters && (
            <Button
              variant="link"
              onClick={() => {
                setQuery("");
                setInstitution("");
                setDivision("");
                setStatus("active");
                setPage(1);
              }}
            >
              Reset filter
            </Button>
          )}
        </div>
        <ErrorNotice message={error} retry={() => void reload()} />
        {!deleting && <ErrorNotice message={actionError} />}
        <BulkSelectionBar
          count={selection.selected.length}
          busy={busy || loading || !!error}
          onClear={selection.clear}
          onDelete={() =>
            setBulkTargets(
              selection.selected.map((item) => ({
                id: item.employee_id,
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
                <th>Nama karyawan</th>
                <th>NIK KTP</th>
                <th>Mitra</th>
                <th>Bidang</th>

                <th>Status</th>
                <th className="actions-cell">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="empty-state">
                    Memuat data karyawan…
                  </td>
                </tr>
              ) : items.length ? (
                pageItems.map((item, index) => (
                  <tr key={item.employee_id}>
                    <td className="selection-cell">
                      <SelectionCheckbox
                        label={`Pilih ${item.name}`}
                        checked={selection.selectedIds.has(item.employee_id)}
                        disabled={busy || item.can_delete !== true}
                        reason={
                          item.can_delete !== true
                            ? item.delete_reason ||
                              (item.can_delete === false
                                ? "Karyawan sudah memiliki riwayat absensi dan tidak dapat dihapus."
                                : "Muat ulang data untuk memeriksa apakah data dapat dihapus.")
                            : undefined
                        }
                        onChange={(checked) =>
                          selection.toggle(item.employee_id, checked)
                        }
                      />
                    </td>
                    <td className="row-number">
                      {(current - 1) * size + index + 1}
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.nik || "Belum diisi"}</td>
                    <td>{item.mitra || "—"}</td>
                    <td>{item.bidang || "—"}</td>

                    <td>
                      <span
                        className={`status-pill ${item.isActive ? "status-pill--active" : ""}`}
                      >
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </span>
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
                        action={item.isActive ? "deactivate" : "activate"}
                        disabled={busy}
                        onClick={() => {
                          setStatusError(null);
                          setStatusTarget(item);
                        }}
                      />
                      <ActionButton
                        action="delete"
                        disabled={busy || item.can_delete === false}
                        disabledReason={
                          item.can_delete === false
                            ? item.delete_reason ||
                              "Karyawan sudah memiliki riwayat absensi dan tidak dapat dihapus."
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
                  <td colSpan={8} className="empty-state">
                    Tidak ada karyawan yang sesuai filter. Ubah filter atau
                    tambahkan karyawan.
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
      {form && data && (
        <EmployeeForm
          employee={form.employee}
          institutions={data.institutions}
          divisions={data.divisions}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            notify("Data karyawan berhasil disimpan.");
            void reload();
          }}
        />
      )}
      {detail && (
        <Modal
          title="Detail Karyawan"
          footer={
            <>
              <Button onClick={() => setDetail(null)}>Tutup</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setForm({ employee: detail });
                  setDetail(null);
                }}
              >
                Ubah
              </Button>
            </>
          }
        >
          <dl className="detail-list">
            <dt>Nama lengkap</dt>
            <dd>{detail.name}</dd>
            <dt>NIK KTP</dt>
            <dd>{detail.nik || "Belum diisi"}</dd>
            <dt>Mitra</dt>
            <dd>{detail.mitra || "—"}</dd>
            <dt>Bidang</dt>
            <dd>{detail.bidang || "—"}</dd>

            <dt>Status</dt>
            <dd>{detail.isActive ? "Aktif" : "Nonaktif"}</dd>
          </dl>
        </Modal>
      )}
      {statusTarget && (
        <Modal
          title={`${statusTarget.isActive ? "Nonaktifkan" : "Aktifkan"} Karyawan`}
          footer={
            <>
              <Button disabled={busy} onClick={() => setStatusTarget(null)}>
                Batal
              </Button>
              <Button
                variant={statusTarget.isActive ? "danger" : "primary"}
                loading={busy}
                onClick={() => void changeStatus()}
              >
                {statusTarget.isActive ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            </>
          }
        >
          <p>
            {statusTarget.isActive ? "Nonaktifkan" : "Aktifkan"}{" "}
            <strong>{statusTarget.name}</strong>?{" "}
            {statusTarget.isActive
              ? "Karyawan tidak dapat login dan semua sesi aktifnya akan dicabut. Riwayat absensi tetap tersimpan."
              : "Karyawan dapat login dan melakukan absensi kembali."}
          </p>
          <ErrorNotice message={statusError} />
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Hapus Karyawan"
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
            Hapus permanen <strong>{deleting.name}</strong>? Data karyawan akan
            dihapus dan semua sesi login dicabut. Penghapusan hanya diizinkan
            jika belum pernah ada data absensi.
          </p>
          <ErrorNotice message={actionError} />
        </Modal>
      )}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={() => {
            void reload();
            notify("Import karyawan selesai. Periksa ringkasan hasil import.");
          }}
        />
      )}
      {bulkTargets && (
        <BulkDeleteDialog
          items={bulkTargets}
          label={"karyawan"}
          onDelete={employeeApi.remove}
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
