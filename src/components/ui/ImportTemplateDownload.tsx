import { Button } from "./Button";
import { TransferIcon } from "./TransferIcon";

export function ImportTemplateDownload({
  onDownload,
  disabled = false,
  loading = false,
}: {
  onDownload: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="import-template">
      <div className="import-template__copy">
        <strong>Mulai dari template Excel</strong>
        <p>Unduh template, isi datanya, lalu upload file yang sudah diisi.</p>
      </div>
      <Button
        icon={<TransferIcon direction="download" />}
        disabled={disabled}
        loading={loading}
        onClick={onDownload}
      >
        Unduh Template Excel
      </Button>
    </div>
  );
}
