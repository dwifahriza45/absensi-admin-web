import { useEffect, useId, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  size?: "default" | "wide";
  children: ReactNode;
  footer: ReactNode;
}

export function Modal({
  title,
  children,
  footer,
  size = "default",
}: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const previous = opener.current;
    const panel = dialog.current;
    const elements = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]):not([hidden]),select:not([disabled]),a[href],[tabindex="0"]',
        ) ?? [],
      );
    if (!panel?.contains(document.activeElement)) elements()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const targets = elements();
      const first = targets[0],
        last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    panel?.addEventListener("keydown", trap);
    return () => {
      panel?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <div
        ref={dialog}
        className={`modal${size === "wide" ? " modal--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <strong id={titleId} className="modal__title">
          {title}
        </strong>
        <div className="modal__body">{children}</div>
        <div className="modal__footer">{footer}</div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__dot" aria-hidden="true" />
      {message}
    </div>
  );
}

export function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`badge badge--${tone}`}>{label}</span>;
}
