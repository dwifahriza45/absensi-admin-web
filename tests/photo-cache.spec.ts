import { test, expect } from "@playwright/test";

test("photo cache survives reload, deduplicates requests, expires and clears", async ({
  page,
}) => {
  let downloads = 0;
  await page.route("**/api/v1/admin/auth/**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.route("**/api/v1/admin/photos/cache-test", (route) => {
    downloads++;
    return route.fulfill({ contentType: "image/png", body: "photo-data" });
  });
  await page.goto("/admin/");
  const fetchPhoto = () =>
    page.evaluate(async () => {
      // Vite serves the actual application module in this browser test.
      const modulePath = "/admin/src/api/photo.api.ts";
      const api = await import(/* @vite-ignore */ modulePath);
      api.setPhotoCacheOwner("cache-admin");
      return Promise.all([
        api.photoApi.fetchBlob("cache-test"),
        api.photoApi.fetchBlob("cache-test"),
      ]).then((blobs) => Promise.all(blobs.map((blob) => blob.text())));
    });
  expect(await fetchPhoto()).toEqual(["photo-data", "photo-data"]);
  expect(downloads).toBe(1);
  await page.reload();
  await fetchPhoto();
  expect(downloads).toBe(1);
  await page.evaluate(async () => {
    const cache = await caches.open("absensi-admin-photos-v1-cache-admin");
    const path = "/api/v1/admin/photos/cache-test";
    const hit = (await cache.match(path))!;
    const headers = new Headers(hit.headers);
    headers.set("X-Cached-At", String(Date.now() - 25 * 60 * 60 * 1000));
    await cache.put(path, new Response(await hit.blob(), { headers }));
  });
  await fetchPhoto();
  expect(downloads).toBe(2);
  await page.evaluate(async () => {
    const modulePath = "/admin/src/api/photo.api.ts";
    const api = await import(/* @vite-ignore */ modulePath);
    api.clearStoredPhotoCache();
    api.setPhotoCacheOwner("cache-admin");
    await api.photoApi.fetchBlob("cache-test");
  });
  expect(downloads).toBe(3);
  await page.evaluate(async () => {
    const modulePath = "/admin/src/api/photo.api.ts";
    const api = await import(/* @vite-ignore */ modulePath);
    api.setPhotoCacheOwner("other-admin");
    await api.photoApi.fetchBlob("cache-test");
  });
  expect(downloads).toBe(4);
  expect(await page.evaluate(() => caches.keys())).not.toContain(
    "absensi-admin-photos-v1-cache-admin",
  );
});
