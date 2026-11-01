import { useId } from "react";
import { normalizePhone } from "@/utils/phone";

/** Shows the country code separately; emits canonical 62-prefixed numbers. */
export function PhoneField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (phone: string) => void;
  error?: string;
}) {
  const id = useId();
  const normalized = normalizePhone(value);
  const national = normalized.startsWith("62")
    ? normalized.slice(2)
    : normalized;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        NOMOR HP
      </label>
      <div className="phone-control">
        <span className="phone-control__prefix" aria-disabled="true">
          +62
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="control"
          value={national}
          placeholder="8xxx-xxxx-xxxx"
          onChange={(event) => {
            const digits = normalizePhone(event.target.value);
            onChange(
              digits ? (digits.startsWith("62") ? digits : `62${digits}`) : "",
            );
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <small id={`${id}-error`} className="text-error">
          {error}
        </small>
      )}
    </div>
  );
}
