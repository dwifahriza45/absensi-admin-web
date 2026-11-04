import { test, expect, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

type Master = {
  can_delete?: boolean;
  employee_count?: number;
  delete_reason?: string;
  id: string;
  name: string;
  mitra_id?: string;
  bidang_id?: string;
};
async function apiFixture(page: Page, loggedIn = true) {
  const state = {
    loggedIn,
    refreshes: 0,
    refreshNeeded: false,
    mitra: [
      {
        id: "uuid-mitra",
        mitra_id: "MTR-20261031-000001",
        name: "Mitra Demo",
        can_delete: false,
        employee_count: 1,
        delete_reason: "Mitra masih digunakan oleh 1 karyawan.",
      },
    ] as Master[],
    bidang: [
      {
        id: "uuid-bidang",
        bidang_id: "BID-20261031-000001",
        name: "Bidang Demo",
        can_delete: false,
        employee_count: 1,
        delete_reason: "Bidang masih digunakan oleh 1 karyawan.",
      },
    ] as Master[],
    employees: [
      {
        id: "uuid-employee",
        employee_id: "EMP-20261031-000001",
        name: "Karyawan Demo",
        has_attendance: true,
        can_delete: false,
        delete_reason:
          "Karyawan sudah memiliki riwayat absensi dan tidak dapat dihapus.",
        nik: "0123456789012345",
        phone: "081234567890",
        mitra_id: "MTR-20261031-000001",
        bidang_id: "BID-20261031-000001",
        mitra: "Mitra Demo",
        bidang: "Bidang Demo",

        isActive: true,
      },
    ],
    writes: [] as {
      method: string;
      path: string;
      body: Record<string, unknown>;
    }[],
  };
  await page.route("**/api/v1/admin/**", async (route) => {
    const request = route.request(),
      method = request.method();
    const path = new URL(request.url()).pathname.replace("/api/v1/admin/", "");
    const reply = (
      data: unknown,
      status = 200,
      message = "Success",
      valid?: object,
    ) =>
      route.fulfill({
        status,
        json: {
          code: status,
          status: status < 400 ? "OK" : "NOK",
          message,
          data,
          error: status >= 400,
          valid,
        },
      });
    expect(request.headers().authorization).toBeUndefined();
    if (path === "auth/login") {
      const body = request.postDataJSON();
      if (!body.email || !body.password)
        return reply(null, 400, "Validation Failed", {
          email: "Email Wajib Diisi",
          password: "Password Wajib Diisi",
        });
      state.loggedIn = true;
      return reply({ expiresAt: "2026-10-31T23:00:00+07:00" });
    }
    if (path === "auth/refresh") {
      state.refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 80));
      state.refreshNeeded = false;
      return state.loggedIn ? reply({}) : reply(null, 401, "Sesi berakhir.");
    }
    if (path === "auth/logout") {
      state.loggedIn = false;
      return reply(null);
    }
    if (!state.loggedIn || state.refreshNeeded)
      return reply(null, 401, "Sesi berakhir.");
    if (path === "auth/me")
      return reply({
        fullname: "Admin Demo",
        email: "admin@example.test",
        role: "admin",
        user_id: "USER-20261031-000001",
      });
    if (path.startsWith("probe")) return reply({ ok: true });
    if (path.startsWith("attendances/version")) return reply({ version: 0 });
    if (path === "attendances") return reply([]);
    if (path === "employees/filter-options")
      return reply({
        mitra: ["Mitra Demo"],
        bidang: ["Bidang Demo"],
      });
    if (path === "employees/import") {
      const body = request.postDataJSON();
      expect(body.deactivateMissing).toBe(false);
      expect(body.rows).toHaveLength(2);
      expect(body.rows[0]).toEqual({
        nik: "0123456789012346",
        employee_id: "",
        name: "Import Karyawan",
        mitra: "Mitra Demo",
        bidang: "Bidang Demo",
      });
      return reply({
        created: 1,
        updated: 0,
        deactivated: 0,
        skipped: [
          {
            row: 3,
            name: "NIK Tidak Valid",
            reason: "NIK Harus 16 Digit Angka",
          },
        ],
      });
    }
    if (/^employees\/[^/]+\/status$/.test(path)) {
      const id = path.split("/")[1],
        body = request.postDataJSON();
      const item = state.employees.find((row) => row.employee_id === id);
      expect(Object.keys(body)).toEqual(["isActive"]);
      if (!item) return reply(null, 404);
      item.isActive = body.isActive;
      return reply(item);
    }
    if (path.startsWith("employees")) {
      const id = path.split("/")[1];
      const item = state.employees.find((row) => row.employee_id === id);
      if (method === "GET") return reply(id ? item : state.employees);
      const body = request.postData() ? request.postDataJSON() : {};
      state.writes.push({ method, path, body });
      if (method === "POST") {
        const next = {
          ...state.employees[0],
          ...body,
          employee_id: "EMP-20261031-000002",
          id: "uuid-new",
          has_attendance: false,
          can_delete: true,
          delete_reason: "",
          mitra: "Mitra Demo",
          bidang: "Bidang Demo",
        };
        state.employees.push(next);
        return reply(next, 201);
      }
      if (!item) return reply(null, 404);
      if (method === "PUT") Object.assign(item, body);
      if (method === "DELETE") {
        if (item.has_attendance) {
          item.can_delete = false;
          item.delete_reason =
            "Karyawan sudah memiliki riwayat absensi dan tidak dapat dihapus.";
          return reply(
            null,
            409,
            "Karyawan sudah memiliki riwayat absensi dan tidak dapat dihapus.",
          );
        }
        state.employees.splice(state.employees.indexOf(item), 1);
      }
      return reply(item);
    }
    const [kind, id] = path.split("/");
    if (kind === "mitra" || kind === "bidang") {
      const rows = state[kind],
        key = `${kind}_id` as "mitra_id" | "bidang_id";
      if (id === "export" || (id === "import" && method === "GET"))
        return route.fulfill({
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          body: Buffer.from("XLSX fixture"),
        });
      if (id === "import") {
        expect(request.headers()["content-type"]).toContain(
          "multipart/form-data; boundary=",
        );
        expect(request.postDataBuffer()?.toString()).toContain('name="file"');
        return reply({
          total: 3,
          success: 1,
          skip: 1,
          error: 1,
          rows: [
            {
              row: 2,
              name: "Baru",
              status: "success",
              message: "Berhasil disimpan.",
            },
            { row: 3, name: "Lama", status: "skip", message: "Sudah ada." },
            { row: 4, name: "", status: "error", message: "Nama Wajib Diisi" },
          ],
        });
      }
      const item = rows.find((row) => row[key] === id);
      if (method === "GET") return reply(id ? item : rows);
      const body = request.postData() ? request.postDataJSON() : {};
      if (method !== "DELETE" && !body.name)
        return reply(null, 400, "Validation Failed", {
          name: "Nama Wajib Diisi",
        });
      if (method === "POST") {
        const next = {
          id: "uuid-new-master",
          can_delete: true,
          employee_count: 0,
          [key]: `${kind === "mitra" ? "MTR" : "BID"}-20261031-000002`,
          name: body.name,
        };
        rows.push(next);
        return reply(next, 201);
      }
      if (!item) return reply(null, 404);
      if (method === "PUT") Object.assign(item, body);
      if (method === "DELETE") {
        state.writes.push({ method, path, body });
        if (state.employees.some((employee) => employee[key] === id)) {
          item.can_delete = false;
          item.delete_reason = "Data masih dipakai karyawan.";
          return reply(null, 409, "Data masih dipakai karyawan.");
        }
        rows.splice(rows.indexOf(item), 1);
      }
      return reply(item);
    }
    return reply(null, 404, "Not found");
  });
  return state;
}

test("login validation, session restore, single refresh for parallel 401s, logout", async ({
  page,
}) => {
  const state = await apiFixture(page, false);
  await page.goto("/admin/login");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByText("Email Wajib Diisi", { exact: true }),
  ).toBeVisible();
  await page.getByLabel(/^EMAIL/).fill("admin@example.test");
  await page.getByLabel(/^PASSWORD/).fill("test-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/?$/);
  expect(
    await page.evaluate(() => localStorage.getItem("absensi.admin.token")),
  ).toBeNull();
  await page.reload();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page.goto("/admin/mitra");
  await expect(
    page.getByRole("heading", { name: "Data Mitra", exact: true }),
  ).toBeVisible();
  const before = state.refreshes;
  state.refreshNeeded = true;
  await page.evaluate(async () => {
    // @ts-expect-error Vite serves the source module during browser tests.
    const { request } = await import("/admin/src/api/client.ts");
    await Promise.all([
      request("/api/v1/admin/probe1"),
      request("/api/v1/admin/probe2"),
      request("/api/v1/admin/probe3"),
    ]);
  });
  expect(state.refreshes - before).toBe(1);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Keluar dari akun?" }),
  ).toBeVisible();
  expect(state.loggedIn).toBe(true);
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.loggedIn).toBe(true);
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await page.getByRole("button", { name: "Ya, keluar", exact: true }).click();

  await expect(
    page.getByRole("button", { name: "Masuk", exact: true }),
  ).toBeVisible();
  expect(state.loggedIn).toBe(false);
});

for (const [kind, label] of [
  ["mitra", "Mitra"],
  ["bidang", "Bidang"],
] as const) {
  test(`${label}: create, detail/update, FK error, delete, import outcomes`, async ({
    page,
  }) => {
    const state = await apiFixture(page);
    await page.goto(`/admin/${kind}`);
    await expect(
      page.getByRole("heading", { name: `Data ${label}`, exact: true }),
    ).toBeVisible();
    const usedDelete = page
      .getByRole("button", { name: "Hapus", exact: true })
      .first();
    await expect(usedDelete).toBeDisabled();
    await usedDelete.locator("..").hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      `${label} masih digunakan oleh 1 karyawan.`,
    );
    await usedDelete.locator("..").focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    // A relation created after a list snapshot must still be rejected by the API.
    state[kind][0].can_delete = true;
    state[kind][0].delete_reason = undefined;
    await page.getByRole("button", { name: "Muat ulang", exact: true }).click();
    await expect(usedDelete).toBeEnabled();
    await usedDelete.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hapus", exact: true })
      .click();
    await expect(
      page.getByText("Data masih dipakai karyawan.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Batal", exact: true }).click();
    await page
      .getByRole("button", { name: `+ Tambah ${label}`, exact: true })
      .click();
    await page.getByLabel(`NAMA ${label.toUpperCase()}`).fill(`${label} Baru`);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    const row = page
      .getByRole("row")
      .filter({ has: page.getByText(`${label} Baru`, { exact: true }) });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Detail", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(`${label} Baru`);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Ubah", exact: true })
      .click();
    await page
      .getByLabel(`NAMA ${label.toUpperCase()}`)
      .fill(`${label} Diperbarui`);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    const updated = page
      .getByRole("row")
      .filter({ has: page.getByText(`${label} Diperbarui`, { exact: true }) });
    await updated.getByRole("button", { name: "Hapus", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hapus", exact: true })
      .click();
    await expect(updated).toHaveCount(0);
    expect(state[kind]).toHaveLength(1);
    await page
      .getByRole("button", { name: "Import Excel", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .locator("input[type=file]")
      .setInputFiles({
        name: `${kind}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("fixture"),
      });
    await page
      .getByRole("button", { name: "Import file", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").getByText("Nama Wajib Diisi", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog").locator(".import-counts"),
    ).toContainText("1 Berhasil");
    await expect(
      page.getByRole("dialog").locator(".import-counts"),
    ).toContainText("1 Dilewati");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Tutup", exact: true })
      .click();
  });
}

test("employee master IDs, no phone fields, deactivate and restore", async ({
  page,
}) => {
  const state = await apiFixture(page);
  await page.goto("/admin/karyawan");
  await expect(
    page.getByRole("heading", { name: "Data Karyawan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Nomor HP", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  const protectedRow = page
    .getByRole("row")
    .filter({ has: page.getByText("Karyawan Demo", { exact: true }) });
  await expect(
    protectedRow.getByRole("button", { name: "Hapus", exact: true }),
  ).toBeDisabled();
  await protectedRow
    .getByRole("button", { name: "Hapus", exact: true })
    .locator("..")
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    "sudah memiliki riwayat absensi",
  );

  await page
    .getByRole("button", { name: "+ Tambah Karyawan", exact: true })
    .click();
  await expect(page.getByLabel("STATUS", { exact: true })).toHaveCount(0);
  await page.getByLabel("NAMA LENGKAP", { exact: true }).fill("Karyawan Baru");
  await page.getByLabel("NIK KTP", { exact: true }).fill("0123456789012346");
  await expect(page.getByLabel("NOMOR HP", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("MITRA", { exact: true })
    .selectOption("MTR-20261031-000001");
  await page
    .getByLabel("BIDANG", { exact: true })
    .selectOption("BID-20261031-000001");
  await page
    .getByRole("button", { name: "Simpan karyawan", exact: true })
    .click();
  expect(state.writes.at(-1)?.body.nik).toBe("0123456789012346");
  expect(state.writes.at(-1)?.body.mitra_id).toBe("MTR-20261031-000001");
  const row = page
    .getByRole("row")
    .filter({ has: page.getByText("Karyawan Baru", { exact: true }) });
  await row.getByRole("button", { name: "Ubah", exact: true }).click();
  await page.getByLabel("NIK KTP", { exact: true }).fill("0123456789012347");
  await page
    .getByRole("button", { name: "Simpan karyawan", exact: true })
    .click();
  expect(state.writes.at(-1)?.body.nik).toBe("0123456789012347");
  expect(state.writes.at(-1)?.body.phone).toBeUndefined();
  expect(state.writes.at(-1)?.body.isActive).toBeUndefined();
  await row.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Nonaktifkan", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page.getByLabel("Filter status").selectOption("inactive");
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Aktifkan", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Aktifkan", exact: true })
    .click();
  await page.getByLabel("Filter status").selectOption("active");
  await expect(row).toBeVisible();
  await page.screenshot({
    path: "test-results/karyawan-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Data Karyawan", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/karyawan-mobile.png",
    fullPage: true,
  });
  await row.getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Hapus Karyawan" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  expect(state.employees).toHaveLength(1);
  expect(state.writes.at(-1)?.method).toBe("DELETE");
});

for (const legacy of [false, true]) {
  test(`employee Excel preview and per-row import result stay visible (legacy=${legacy})`, async ({
    page,
  }) => {
    await apiFixture(page);
    await page.goto("/admin/karyawan");
    await page
      .getByRole("button", { name: "Import Excel", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([
      {
        ...(legacy ? { "NOMOR HP": "081234567899" } : {}),
        NIK: "0123456789012346",
        "NAMA LENGKAP": "Import Karyawan",
        MITRA: "Mitra Demo",

        BIDANG: "Bidang Demo",
      },
      {
        "NAMA LENGKAP": "NIK Tidak Valid",
        MITRA: "Mitra Demo",

        BIDANG: "Bidang Demo",
      },
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Karyawan");
    await dialog.locator("input[type=file]").setInputFiles({
      name: "karyawan.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(
        XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
      ),
    });
    await dialog
      .getByRole("button", { name: "Simpan 2 pegawai", exact: true })
      .click();
    await expect(
      dialog.getByText("NIK Harus 16 Digit Angka", { exact: true }),
    ).toBeVisible();
    await expect(dialog.locator(".import-counts")).toContainText("1 Baru");
    await expect(dialog.locator(".import-counts")).toContainText("1 Dilewati");
    await dialog.getByRole("button", { name: "Tutup", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}

for (const resource of ["mitra", "bidang", "employees"] as const) {
  test(`bulk ${resource}: safe selection across pages, cancel and stale relations`, async ({
    page,
  }) => {
    const state = await apiFixture(page);
    const original =
      resource === "employees" ? state.employees[0] : state[resource][0];
    const code = (i: number) =>
      `${resource === "mitra" ? "MTR" : resource === "bidang" ? "BID" : "EMP"}-20261101-${String(i + 100).padStart(6, "0")}`;
    for (let i = 1; i <= 11; i++) {
      if (resource === "employees")
        state.employees.push({
          ...state.employees[0],
          id: `bulk-${i}`,
          employee_id: code(i),
          name: `Bulk ${i}`,
          phone: `081234${String(i).padStart(6, "0")}`,
          has_attendance: false,
          can_delete: true,
          delete_reason: "",
        });
      else
        state[resource].push({
          id: `bulk-${i}`,
          [`${resource}_id`]: code(i),
          name: `Bulk ${i}`,
          can_delete: true,
          employee_count: 0,
        });
    }
    await page.goto(
      resource === "employees" ? "/admin/karyawan" : `/admin/${resource}`,
    );
    const protectedCheck = page.getByRole("checkbox", {
      name: `Pilih ${original.name}`,
      exact: true,
    });
    await expect(protectedCheck).toBeDisabled();
    const header = page.getByRole("checkbox", {
      name: "Pilih semua yang dapat dihapus di halaman ini",
      exact: true,
    });
    await header.check();
    await expect(
      page.getByRole("button", { name: "Hapus terpilih (9)", exact: true }),
    ).toBeVisible();
    await page.getByRole("searchbox").fill("Bulk");
    await expect(
      page.getByRole("region", { name: "Data terpilih" }),
    ).toHaveCount(0);
    await page.getByRole("searchbox").fill("");
    await header.check();
    await page.getByRole("button", { name: "Berikutnya", exact: true }).click();
    await header.check();
    const deleteSelected = page.getByRole("button", {
      name: "Hapus terpilih (11)",
      exact: true,
    });
    await deleteSelected.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Batal", exact: true })
      .click();
    expect(
      state.writes.filter((write) => write.method === "DELETE"),
    ).toHaveLength(0);
    if (resource === "employees")
      state.employees.find(
        (item) => item.employee_id === code(11),
      )!.has_attendance = true;
    else state.employees[0][`${resource}_id`] = code(11);
    await deleteSelected.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hapus 11 data", exact: true })
      .click();
    await expect(
      page.getByRole("dialog").locator(".import-counts"),
    ).toContainText("10 Berhasil");
    await expect(
      page.getByRole("dialog").locator(".import-counts"),
    ).toContainText("1 Dilewati");
    await expect(
      page.getByRole("dialog").locator(".import-counts"),
    ).toContainText("0 Gagal");
    const remaining =
      resource === "employees" ? state.employees : state[resource];
    expect(remaining).toHaveLength(2);
    expect(remaining.map((item) => item.name)).toContain(original.name);
    expect(remaining.map((item) => item.name)).toContain("Bulk 11");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Tutup", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Data terpilih" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("checkbox", { name: "Pilih Bulk 11", exact: true }),
    ).toBeDisabled();
  });
}

test("bulk delete stops on infrastructure failure without claiming remaining rows succeeded", async ({
  page,
}) => {
  const state = await apiFixture(page);
  for (let i = 1; i <= 2; i++)
    state.mitra.push({
      id: `unused-${i}`,
      mitra_id: `MTR-20261101-00000${i}`,
      name: `Unused ${i}`,
      can_delete: true,
      employee_count: 0,
    });
  let attempts = 0;
  await page.route("**/api/v1/admin/mitra/*", (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    attempts++;
    return route.fulfill({
      status: 503,
      json: {
        code: 503,
        status: "NOK",
        message: "Server sedang sibuk.",
        error: true,
      },
    });
  });
  await page.goto("/admin/mitra");
  await page
    .getByRole("checkbox", {
      name: "Pilih semua yang dapat dihapus di halaman ini",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Hapus terpilih (2)", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hapus 2 data", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".import-counts"),
  ).toContainText("0 Berhasil");
  await expect(
    page.getByRole("dialog").locator(".import-counts"),
  ).toContainText("1 Dilewati");
  await expect(
    page.getByRole("dialog").locator(".import-counts"),
  ).toContainText("1 Gagal");
  expect(attempts).toBe(1);
  expect(state.mitra).toHaveLength(3);
  await expect(page.getByRole("dialog")).toContainText(
    "Belum diproses karena terjadi kendala",
  );
});

test("employee summary cards filter status and stay synchronized with dropdown", async ({
  page,
}) => {
  const state = await apiFixture(page);
  state.employees.push({
    ...state.employees[0],
    id: "inactive-id",
    employee_id: "EMP-20261031-000099",
    name: "Karyawan Nonaktif Uji",
    isActive: false,
  });
  await page.goto("/admin/karyawan");
  const cards = page.getByLabel("Filter ringkasan karyawan");
  const status = page.getByRole("combobox", { name: "Filter status" });
  await cards
    .getByRole("button", { name: "Karyawan nonaktif", exact: true })
    .click();
  await expect(status).toHaveValue("inactive");
  await expect(page.locator("tbody")).toContainText("Karyawan Nonaktif Uji");
  await expect(
    cards.getByRole("button", { name: "Karyawan nonaktif", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await cards
    .getByRole("button", { name: "Karyawan aktif", exact: true })
    .click();
  await expect(status).toHaveValue("active");
  await expect(page.locator("tbody")).not.toContainText(
    "Karyawan Nonaktif Uji",
  );
  await cards
    .getByRole("button", { name: "Total karyawan", exact: true })
    .click();
  await expect(status).toHaveValue("all");
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await status.selectOption("inactive");
  await expect(
    cards.getByRole("button", { name: "Karyawan nonaktif", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("monitoring displays API snake_case selfie and work report photos", async ({
  page,
}) => {
  const state = await apiFixture(page);
  await page.route("**/api/v1/admin/attendances?*", (route) => {
    const date = new URL(route.request().url()).searchParams.get("from");
    return route.fulfill({
      json: {
        code: 200,
        status: "OK",
        error: false,
        data: [
          {
            id: "attendance-uuid",
            attendance_id: "ATT-20261101-000001",
            employee_id: state.employees[0].employee_id,
            workDate: date,
            employee: state.employees[0],
            checkInAt: `${date}T08:00:00+07:00`,
            checkInLocation: { lat: -6.9, lng: 106.9, accuracyM: 10 },
            check_in_selfie_id: "PHO-20261101-000001",
            checkOutAt: `${date}T17:00:00+07:00`,
            checkOutLocation: { lat: -6.9, lng: 106.9, accuracyM: 10 },
            check_out_selfie_id: "PHO-20261101-000002",
            checkOutReason: null,
            earlyLeave: null,
            needsReview: false,
            sessions: [
              {
                no: 1,
                photo_id: "PHO-20261101-000003",
                receivedAt: `${date}T10:00:00+07:00`,
              },
            ],
          },
        ],
      },
    });
  });
  const requested = new Set<string>();
  await page.route("**/api/v1/admin/photos/*", (route) => {
    requested.add(new URL(route.request().url()).pathname.split("/").at(-1)!);
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.goto("/admin/");
  await page
    .locator(".table__row")
    .filter({ hasText: "Karyawan Demo" })
    .click();
  await expect(page.locator(".detail__selfies .photo-thumb")).toHaveCount(2);
  await page
    .locator(".table__row")
    .filter({ hasText: "Karyawan Demo" })
    .click();
  await expect(page.locator(".detail--empty")).toBeVisible();
  await page
    .locator(".table__row")
    .filter({ hasText: "Karyawan Demo" })
    .click();
  await page.getByRole("button", { name: "Tutup detail" }).click();
  await expect(page.locator(".detail--empty")).toBeVisible();
  await page
    .locator(".table__row")
    .filter({ hasText: "Karyawan Demo" })
    .click();
  for (const image of await page.locator(".detail__selfies .photo-thumb").all())
    await expect(image).toHaveCSS("background-image", /blob:/);
  await expect(page.locator(".detail__work .photo-thumb").first()).toHaveCSS(
    "background-image",
    /blob:/,
  );
  expect([...requested]).toEqual(
    expect.arrayContaining([
      "PHO-20261101-000001",
      "PHO-20261101-000002",
      "PHO-20261101-000003",
    ]),
  );
  await page
    .locator(".detail")
    .screenshot({ path: "test-results/attendance-detail-desktop.png" });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh PDF", exact: true }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toMatch(/^absensi-Karyawan-Demo-.*\.pdf$/);
  await pdf.saveAs("test-results/attendance-report.pdf");
  const { readFile } = await import("node:fs/promises");
  const bytes = await readFile("test-results/attendance-report.pdf");
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const imageDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Unduh foto masuk", exact: true })
    .click();
  const image = await imageDownload;
  expect(image.suggestedFilename()).toMatch(/selfie-masuk\.png$/);
  const imageBytes = await readFile((await image.path())!);
  expect(imageBytes.subarray(1, 4).toString()).toBe("PNG");
  await expect(
    page.getByRole("button", { name: "Unduh foto sesi 1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unduh foto sesi 2", exact: true }),
  ).toHaveCount(0);
});

test("attendance Excel exports the filtered list including name, master filters and status", async ({
  page,
}) => {
  const state = await apiFixture(page);
  state.employees.push({
    ...state.employees[0],
    id: "absent-uuid",
    employee_id: "EMP-20261101-000099",
    name: "Belum Hadir Uji",
  });
  const filters: URL[] = [];
  await page.route("**/api/v1/admin/attendances?*", (route) => {
    const url = new URL(route.request().url());
    filters.push(url);
    const date = url.searchParams.get("from");
    return route.fulfill({
      json: {
        code: 200,
        error: false,
        data: [
          {
            id: "att-export",
            workDate: date,
            employee: state.employees[0],
            checkInAt: `${date}T08:00:00+07:00`,
            checkInLocation: { lat: -6.9, lng: 106.9, accuracyM: 10 },
            check_in_selfie_id: null,
            checkOutAt: null,
            check_out_selfie_id: null,
            needsReview: false,
            sessions: [],
          },
        ],
      },
    });
  });
  await page.goto("/admin/");
  await page
    .getByRole("combobox", { name: "MITRA", exact: true })
    .selectOption("Mitra Demo");
  await page
    .getByRole("combobox", { name: "BIDANG", exact: true })
    .selectOption("Bidang Demo");
  await expect
    .poll(() =>
      filters.some(
        (u) =>
          u.searchParams.get("mitra") === "Mitra Demo" &&
          u.searchParams.get("bidang") === "Bidang Demo",
      ),
    )
    .toBe(true);
  await page.getByPlaceholder("Cari nama pegawai").fill("Karyawan Demo");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Excel", exact: true }).click();
  const file = await download;
  const { readFile } = await import("node:fs/promises");
  const workbook = XLSX.read(await readFile((await file.path())!), {
    type: "buffer",
  });
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
    workbook.Sheets.Absensi,
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].Nama).toBe("Karyawan Demo");
  expect(rows[0].Mitra).toBe("Mitra Demo");
  expect(rows[0].Bidang).toBe("Bidang Demo");
  await page.getByPlaceholder("Cari nama pegawai").fill("");
  await page.locator(".stat-card").filter({ hasText: "Belum absen" }).click();
  const absentDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Excel", exact: true }).click();
  const absentBook = XLSX.read(
    await readFile((await (await absentDownload).path())!),
    { type: "buffer" },
  );
  const absentRows = XLSX.utils.sheet_to_json<Record<string, string>>(
    absentBook.Sheets.Absensi,
  );
  expect(absentRows).toHaveLength(1);
  expect(absentRows[0].Nama).toBe("Belum Hadir Uji");
  expect(absentRows[0].Status).toBe("Belum absen");
});

test("employee date history includes attendance and missing dates in list and Excel", async ({
  page,
}) => {
  const state = await apiFixture(page);
  await page.route("**/api/v1/admin/attendances?*", (route) => {
    const date = new URL(route.request().url()).searchParams.get("to");
    return route.fulfill({
      json: {
        code: 200,
        error: false,
        data: [
          {
            id: "history-attendance",
            workDate: date,
            employee: state.employees[0],
            checkInAt: `${date}T08:00:00+07:00`,
            checkInLocation: { lat: -6.9, lng: 106.9, accuracyM: 10 },
            check_in_selfie_id: null,
            checkOutAt: null,
            check_out_selfie_id: null,
            needsReview: false,
            sessions: [],
          },
        ],
      },
    });
  });
  await page.goto("/admin/");
  await page
    .getByRole("combobox", { name: "MITRA", exact: true })
    .selectOption("Mitra Demo");
  await page
    .getByRole("combobox", { name: "BIDANG", exact: true })
    .selectOption("Bidang Demo");
  await page
    .getByRole("combobox", { name: "PERIODE", exact: true })
    .selectOption("7d");
  await page.getByPlaceholder("Cari nama pegawai").fill("Karyawan Demo");
  await expect(page.locator(".table__row:not(.table__row--head)")).toHaveCount(
    7,
  );
  await expect(page.locator(".table__date")).toHaveCount(7);
  expect(
    new Set(
      await page
        .locator(".table__date")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("datetime"))),
    ),
  ).toHaveProperty("size", 7);
  await expect(
    page
      .locator(".table__row:not(.table__row--head)")
      .filter({ hasText: "Belum absen" }),
  ).toHaveCount(6);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Excel", exact: true }).click();
  const { readFile } = await import("node:fs/promises");
  const book = XLSX.read(await readFile((await (await download).path())!), {
    type: "buffer",
  });
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
    book.Sheets.Absensi,
  );
  expect(rows).toHaveLength(7);
  expect(rows.filter((row) => row.Status === "Belum absen")).toHaveLength(6);
});

test("recap PDF follows filters and both exports reject more than one month", async ({
  page,
}) => {
  await apiFixture(page);
  let recapCalls = 0;
  await page.route("**/api/v1/admin/attendances/recap?*", (route) => {
    recapCalls++;
    const query = new URL(route.request().url()).searchParams;
    expect(query.get("q")).toBe("Karyawan Demo");
    expect(query.get("mitra")).toBe("Mitra Demo");
    expect(query.has("bidang")).toBe(false);
    expect(query.get("include_absent")).toBe("true");
    return route.fulfill({
      contentType: "application/pdf",
      body: Buffer.from("%PDF-1.4\nrecap-test\n%%EOF\n"),
    });
  });
  await page.goto("/admin/");
  await page.getByPlaceholder("Cari nama pegawai").fill("Karyawan Demo");

  for (const name of ["Rekap", "Export Excel"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(
      name === "Rekap"
        ? "Silakan pilih Mitra terlebih dahulu"
        : "Silakan pilih Mitra dan Bidang terlebih dahulu",
    );
    await page.getByRole("button", { name: "Mengerti", exact: true }).click();
  }
  expect(recapCalls).toBe(0);
  await page
    .getByRole("combobox", { name: "MITRA", exact: true })
    .selectOption("Mitra Demo");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Rekap", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^rekap-absensi-.*\.pdf$/,
  );
  expect(recapCalls).toBe(1);
  await page
    .getByRole("combobox", { name: "BIDANG", exact: true })
    .selectOption("Bidang Demo");
  const filteredDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Rekap", exact: true }).click();
  await filteredDownload;
  expect(recapCalls).toBe(2);
  await page.getByLabel("DARI TANGGAL", { exact: true }).fill("2026-09-01");
  await page.getByLabel("SAMPAI", { exact: true }).fill("2026-11-01");
  const message =
    "Pengambilan data dibatasi maksimal 1 bulan. Silakan sesuaikan rentang tanggal pada filter.";
  for (const name of ["Rekap", "Export Excel"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(message);
    await page.getByRole("button", { name: "Mengerti", exact: true }).click();
  }
  expect(recapCalls).toBe(2);
});
