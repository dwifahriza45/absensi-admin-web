import { Button } from "./Button";
export function ErrorNotice({
  message,
  retry,
}: {
  message: string | null;
  retry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="notice notice--error" role="alert">
      <span>{message}</span>
      {retry && (
        <Button className="btn--small" onClick={retry}>
          Coba lagi
        </Button>
      )}
    </div>
  );
}
export function Pagination({
  page,
  pages,
  total,
  size,
  onPage,
  onSize,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} dari ${total} data`
          : "0 data"}
      </span>
      <div>
        <label>
          Per halaman{" "}
          <select
            aria-label="Data per halaman"
            className="control"
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
          >
            {[10, 20, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <Button
          className="pagination__arrow"
          aria-label="Sebelumnya"
          title="Halaman sebelumnya"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button
          className="pagination__arrow"
          aria-label="Berikutnya"
          title="Halaman berikutnya"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
