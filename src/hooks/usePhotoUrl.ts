import { useEffect, useState } from "react";
import { clearStoredPhotoCache, photoApi } from "@/api/photo.api";

// Disimpan selama halaman terbuka agar foto yang sama tidak diunduh berkali-kali.
const cache = new Map<string, string>();
let cacheGeneration = 0;

export function clearPhotoCache() {
  clearStoredPhotoCache();
  cacheGeneration++;
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}

/** URL lokal untuk foto yang dilindungi cookie admin. */
export function usePhotoUrl(photoId: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(
    photoId ? (cache.get(photoId) ?? null) : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!photoId) {
      setUrl(null);
      return;
    }
    const cached = cache.get(photoId);
    if (cached) {
      setUrl(cached);
      return;
    }

    let active = true;
    const generation = cacheGeneration;
    setUrl(null);
    photoApi
      .fetchBlob(photoId)
      .then((blob) => {
        if (generation !== cacheGeneration) return;
        const objectUrl = URL.createObjectURL(blob);
        cache.set(photoId, objectUrl);
        if (active) setUrl(objectUrl);
      })
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [photoId]);

  return { url, loading: Boolean(photoId) && !url && !failed, failed };
}
