export function TransferIcon({
  direction,
}: {
  direction: "upload" | "download";
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      {direction === "upload" ? (
        <>
          <path d="m7 8 5-5 5 5" />
          <path d="M12 3v12" />
        </>
      ) : (
        <>
          <path d="m7 10 5 5 5-5" />
          <path d="M12 3v12" />
        </>
      )}
    </svg>
  );
}
