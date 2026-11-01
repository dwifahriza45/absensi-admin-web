import { useState } from "react";
import { photoApi } from "@/api/photo.api";
import { Button } from "@/components/ui";
import { TransferIcon } from "@/components/ui/TransferIcon";

export function PhotoDownload({
  photoId,
  filename,
  label,
}: {
  photoId: string | null | undefined;
  filename: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!photoId) return null;
  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    let url: string | undefined;
    try {
      const blob = await photoApi.fetchBlob(photoId);
      const extension = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        } as Record<string, string>
      )[blob.type.split(";")[0]];
      if (!extension) throw new Error("Format foto tidak dikenali.");
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 160)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengunduh foto. Coba lagi.",
      );
    } finally {
      if (url) {
        const objectUrl = url;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
      setBusy(false);
    }
  };
  return (
    <div className="photo-download">
      <Button
        className="btn--small"
        icon={<TransferIcon direction="download" />}
        aria-label={label}
        loading={busy}
        onClick={() => void download()}
      >
        Unduh foto
      </Button>
      {error && (
        <small className="text-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
