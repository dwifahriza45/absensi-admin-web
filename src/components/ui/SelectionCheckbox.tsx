import { useEffect, useRef } from "react";
import { Tooltip } from "./Tooltip";

export function SelectionCheckbox({
  label,
  checked,
  indeterminate = false,
  disabled = false,
  reason,
  onChange,
}: {
  label: string;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  reason?: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const checkbox = (
    <input
      ref={ref}
      type="checkbox"
      className="data-checkbox"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
  return (
    <span className="selection-checkbox">
      {disabled && reason ? (
        <Tooltip message={reason}>{checkbox}</Tooltip>
      ) : (
        checkbox
      )}
    </span>
  );
}
