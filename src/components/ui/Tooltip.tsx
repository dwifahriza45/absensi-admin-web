import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** A focusable wrapper lets disabled controls explain why they are unavailable. */
export function Tooltip({
  message,
  children,
}: {
  message: string;
  children: ReactNode;
}) {
  const id = useId();
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    above: boolean;
    width: number;
  } | null>(null);
  useEffect(() => {
    if (!position) return;
    const hide = () => setPosition(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [position]);
  const show = (element: HTMLElement) => {
    const box = element.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const above = box.top >= 120;
    setPosition({
      left: Math.max(
        12,
        Math.min(box.right - width, window.innerWidth - width - 12),
      ),
      top: above ? box.top - 8 : box.bottom + 8,
      above,
      width,
    });
  };
  return (
    <span
      className="action-tooltip"
      tabIndex={0}
      aria-label={message}
      aria-describedby={position ? id : undefined}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPosition(null);
      }}
    >
      {children}
      {position &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={`control-tooltip ${position.above ? "control-tooltip--above" : ""}`}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
            }}
          >
            {message}
          </span>,
          document.body,
        )}
    </span>
  );
}
