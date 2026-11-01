import { useCallback, useEffect, useRef, useState } from "react";
import { employeeApi } from "@/api/employee.api";
import type { Employee, FilterOptions } from "@/types";

interface EmployeeFilter {
  mitra: string;

  bidang: string;
}

/** Daftar pegawai aktif (untuk menghitung siapa yang belum absen) dan pilihan filter. */
export function useEmployees(filter: EmployeeFilter) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [options, setOptions] = useState<FilterOptions>({
    mitra: [],
    bidang: [],
  });

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await employeeApi.filterOptions());
    } catch {
      // Pilihan filter tidak wajib; tabel tetap bisa tampil.
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const items = await employeeApi.list(filter);
      if (current === sequence.current) setEmployees(items);
    } catch (err) {
      if (current === sequence.current) {
        setEmployees([]);
        setError(
          err instanceof Error ? err.message : "Gagal memuat data karyawan.",
        );
      }
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const reload = useCallback(async () => {
    await Promise.all([loadOptions(), loadEmployees()]);
  }, [loadOptions, loadEmployees]);

  return { employees, options, reload, loading, error };
}
