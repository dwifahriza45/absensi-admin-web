import { usePhotoUrl } from "@/hooks/usePhotoUrl";

interface PhotoThumbProps {
  photoId: string | null | undefined;
  label: string;
  className?: string;
  fallback?: string;
  onOpen?: (url: string, label: string) => void;
}

/** Foto kecil yang bisa diklik untuk diperbesar. */
export function PhotoThumb({
  photoId,
  label,
  className = "",
  fallback = "Belum ada",
  onOpen,
}: PhotoThumbProps) {
  const { url, loading } = usePhotoUrl(photoId);
  const text = url ? "" : loading ? "Memuat…" : fallback;

  if (!onOpen) {
    return (
      <span
        className={`photo-thumb ${className}`}
        style={url ? { backgroundImage: `url(${url})` } : undefined}
        role="img"
        aria-label={label}
        title={label}
      >
        {text}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`photo-thumb ${className}`}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
      disabled={!url}
      title={label}
      onClick={() => url && onOpen?.(url, label)}
    >
      {text}
    </button>
  );
}

interface PhotoLightboxProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function PhotoLightbox({ url, title, onClose }: PhotoLightboxProps) {
  return (
    <div
      className="lightbox"
      onClick={onClose}
      role="dialog"
      aria-label={title}
    >
      <img src={url} alt={title} className="lightbox__image" />
      <span className="lightbox__caption">{title} · klik untuk menutup</span>
    </div>
  );
}
