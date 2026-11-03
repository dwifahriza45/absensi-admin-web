import { requestBlob } from "./client";

const PREFIX = "absensi-admin-photos-v1-";
const MAX_AGE = 24 * 60 * 60 * 1000;
const MAX_BYTES = 50 * 1024 * 1024;
let owner: string | null = null;
let generation = 0;
let queue: Promise<unknown> = Promise.resolve();
const pending = new Map<string, Promise<Blob>>();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work);
  queue = result.catch(() => undefined);
  return result;
}

export function setPhotoCacheOwner(userId: string) {
  if (owner === userId) return;
  generation++;
  owner = userId;
  pending.clear();
  void serialize(async () => {
    const keep = PREFIX + encodeURIComponent(userId);
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== keep) await caches.delete(name);
    }
  }).catch(() => undefined);
}

export function clearStoredPhotoCache() {
  generation++;
  owner = null;
  pending.clear();
  void serialize(async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX)) await caches.delete(name);
    }
  }).catch(() => undefined);
}

async function fetchBlob(photoId: string): Promise<Blob> {
  const path = `/api/v1/admin/photos/${encodeURIComponent(photoId)}`;
  // Only use persistent photos after the API confirms the admin session.
  if (!owner) return requestBlob(path);
  const existing = pending.get(photoId);
  if (existing) return existing;
  const current = generation;
  const name = PREFIX + encodeURIComponent(owner);
  const request = (async () => {
    try {
      const hit = await serialize(async () => {
        const cache = await caches.open(name);
        const response = await cache.match(path);
        if (!response) return null;
        const storedAt = Number(response.headers.get("X-Cached-At"));
        if (!storedAt || Date.now() - storedAt >= MAX_AGE) {
          await cache.delete(path);
          return null;
        }
        return response.blob();
      });
      if (current !== generation) throw new Error("Sesi foto sudah berakhir.");
      if (hit) return hit;
    } catch (error) {
      if (current !== generation) throw error;
      // Unavailable browser storage must not prevent authenticated downloads.
    }
    const blob = await requestBlob(path);
    if (current !== generation) throw new Error("Sesi foto sudah berakhir.");
    if (blob.size <= MAX_BYTES) {
      await serialize(async () => {
        if (current !== generation) return;
        const cache = await caches.open(name);
        let bytes = blob.size;
        const entries: { key: Request; size: number }[] = [];
        for (const key of await cache.keys()) {
          const response = await cache.match(key);
          if (!response) continue;
          const size = Number(response.headers.get("X-Blob-Size"));
          const storedAt = Number(response.headers.get("X-Cached-At"));
          if (!storedAt || Date.now() - storedAt >= MAX_AGE || !size) {
            await cache.delete(key);
          } else {
            bytes += size;
            entries.push({ key, size });
          }
        }
        // Cache keys are in insertion order; remove oldest downloads first.
        for (const entry of entries) {
          if (bytes <= MAX_BYTES) break;
          await cache.delete(entry.key);
          bytes -= entry.size;
        }
        await cache.put(
          path,
          new Response(blob, {
            headers: {
              "Content-Type": blob.type,
              "X-Cached-At": String(Date.now()),
              "X-Blob-Size": String(blob.size),
            },
          }),
        );
      }).catch(() => undefined);
    }
    if (current !== generation) throw new Error("Sesi foto sudah berakhir.");
    return blob;
  })();
  pending.set(photoId, request);
  try {
    return await request;
  } finally {
    if (pending.get(photoId) === request) pending.delete(photoId);
  }
}

export const photoApi = { fetchBlob };
