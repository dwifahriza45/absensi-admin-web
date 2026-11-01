import { Tooltip } from "./Tooltip";
import type { ButtonHTMLAttributes } from "react";

type Action =
  "detail" | "edit" | "delete" | "deactivate" | "activate" | "refresh";
const labels: Record<Action, string> = {
  refresh: "Muat ulang",
  detail: "Detail",
  edit: "Ubah",
  delete: "Hapus",
  deactivate: "Nonaktifkan",
  activate: "Aktifkan",
};
export function ActionButton({
  action,
  loading = false,
  disabledReason,
  disabled,
  ...props
}: {
  action: Action;
  loading?: boolean;
  disabledReason?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const button = (
    <button
      type="button"
      {...props}
      disabled={disabled || !!disabledReason}
      aria-busy={loading || undefined}
      className={`action-icon ${action === "refresh" ? "action-icon--refresh" : ""} ${loading ? "action-icon--loading" : ""} ${action === "activate" ? "action-icon--success" : ""} ${action === "delete" || action === "deactivate" ? "action-icon--danger" : ""}`}
      aria-label={labels[action]}
      title={disabledReason ? undefined : labels[action]}
    >
      <svg
        width={action === "refresh" ? 20 : 18}
        height={action === "refresh" ? 20 : 18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={action === "refresh" ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {action === "refresh" && (
          <>
            <path d="M3 12a9 9 0 0 1 9-9c2.5 0 4.9 1 6.7 2.8L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9c-2.5 0-4.9-1-6.7-2.8L3 16" />
            <path d="M8 16H3v5" />
          </>
        )}
        {action === "detail" && (
          <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
        {action === "edit" && (
          <>
            <path d="m16 3 5 5-12 12-6 1 1-6L16 3Z" />
            <path d="m14 5 5 5" />
          </>
        )}
        {action === "delete" && (
          <>
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
          </>
        )}
        {(action === "deactivate" || action === "activate") && (
          <>
            <path d="M12 2v10M5.6 5.6a9 9 0 1 0 12.8 0" />
          </>
        )}
      </svg>
    </button>
  );
  return disabledReason ? (
    <Tooltip message={disabledReason}>{button}</Tooltip>
  ) : (
    button
  );
}
