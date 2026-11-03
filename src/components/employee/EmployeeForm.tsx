import { PhoneField } from "@/components/ui/PhoneField";
import { normalizePhone } from "@/utils/phone";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/api/client";
import { employeeApi } from "@/api/employee.api";
import { Button, Field, Modal } from "@/components/ui";
import { ErrorNotice } from "@/components/ui/DataFeedback";
import type { Employee, EmployeeWrite, MasterItem } from "@/types";

export function EmployeeForm({
  employee,
  institutions,
  divisions,
  onClose,
  onSaved,
}: {
  employee?: Employee;
  institutions: MasterItem[];
  divisions: MasterItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EmployeeWrite>({
    nik: employee?.nik ?? "",
    name: employee?.name ?? "",
    phone: employee?.phone ?? "",
    mitra_id: employee?.mitra_id ?? "",
    bidang_id: employee?.bidang_id ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState<Record<string, string>>({});
  const change = (field: keyof EmployeeWrite, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValid((current) => ({ ...current, [field]: "" }));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setValid({});
    const body: EmployeeWrite = {
      ...form,
      phone: normalizePhone(form.phone ?? ""),
    };
    // Sending an unchanged phone would revoke sessions unnecessarily.
    if (employee && (form.phone === employee.phone || !form.phone?.trim()))
      delete body.phone;
    try {
      if (employee) await employeeApi.update(employee.employee_id, body);
      else await employeeApi.create(body);
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.hasFieldErrors
          ? null
          : err instanceof Error
            ? err.message
            : "Gagal menyimpan karyawan.",
      );
      if (err instanceof ApiError) setValid(err.valid);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`${employee ? "Ubah" : "Tambah"} Karyawan`}
      footer={
        <>
          <Button disabled={busy} onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="employee-form"
            loading={busy}
          >
            Simpan karyawan
          </Button>
        </>
      }
    >
      <form id="employee-form" className="data-form" onSubmit={save} noValidate>
        <Field label="NAMA LENGKAP">
          <input
            className="control"
            autoFocus
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
            aria-invalid={!!valid.name}
          />
          {valid.name && <small className="text-error">{valid.name}</small>}
        </Field>
        <Field label="NIK KTP">
          <input
            className="control"
            inputMode="numeric"
            maxLength={16}
            placeholder="16 digit NIK KTP"
            value={form.nik}
            onChange={(e) => change("nik", e.target.value)}
            aria-invalid={!!valid.nik}
          />
          {valid.nik && <small className="text-error">{valid.nik}</small>}
        </Field>
        <PhoneField
          value={form.phone ?? ""}
          onChange={(phone) => change("phone", phone)}
          error={valid.phone}
        />
        {employee && (
          <small className="text-muted">
            Mengubah data karyawan akan mengeluarkan karyawan dari semua sesi.
            Kosongkan nomor HP untuk mempertahankan nomor lama.
          </small>
        )}
        <Field label="MITRA">
          <select
            className="control"
            value={form.mitra_id}
            onChange={(e) => change("mitra_id", e.target.value)}
            aria-invalid={!!valid.mitra_id}
          >
            <option value="">Pilih mitra</option>
            {institutions.map((item) => (
              <option key={item.mitra_id} value={item.mitra_id}>
                {item.name}
              </option>
            ))}
          </select>
          {valid.mitra_id && (
            <small className="text-error">{valid.mitra_id}</small>
          )}
        </Field>
        {!institutions.length && (
          <p className="text-muted">
            Tambahkan mitra di menu Mitra terlebih dahulu.
          </p>
        )}
        <Field label="BIDANG">
          <select
            className="control"
            value={form.bidang_id}
            onChange={(e) => change("bidang_id", e.target.value)}
            aria-invalid={!!valid.bidang_id}
          >
            <option value="">Pilih bidang</option>
            {divisions.map((item) => (
              <option key={item.bidang_id} value={item.bidang_id}>
                {item.name}
              </option>
            ))}
          </select>
          {valid.bidang_id && (
            <small className="text-error">{valid.bidang_id}</small>
          )}
        </Field>

        <ErrorNotice message={error} />
      </form>
    </Modal>
  );
}
