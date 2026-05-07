"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export interface DropdownOption<T extends string> {
  label: string;
  value: T;
  description?: string;
  tone?: "default" | "danger";
}

interface CustomDropdownProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  renderTrigger?: (selected: DropdownOption<T>) => ReactNode;
  menuAlign?: "left" | "right";
  minMenuWidth?: string;
}

export function CustomDropdown<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  renderTrigger,
  menuAlign = "right",
  minMenuWidth,
}: CustomDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left?: number;
    right?: number;
  } | null>(null);

  const updateMenuPosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rect = root.getBoundingClientRect();
    const gap = 6;
    const viewportPadding = 8;
    const top = rect.bottom + gap;

    if (menuAlign === "left") {
      setMenuPosition({
        top,
        left: Math.max(viewportPadding, rect.left),
      });
      return;
    }

    setMenuPosition({
      top,
      right: Math.max(viewportPadding, window.innerWidth - rect.right),
    });
  }, [menuAlign]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();

    function handlePositionUpdate() {
      updateMenuPosition();
    }

    window.addEventListener("resize", handlePositionUpdate);
    window.addEventListener("scroll", handlePositionUpdate, true);

    return () => {
      window.removeEventListener("resize", handlePositionUpdate);
      window.removeEventListener("scroll", handlePositionUpdate, true);
    };
  }, [open, updateMenuPosition]);

  const selected =
    options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="custom-dropdown" ref={rootRef}>
      <button
        type="button"
        className="custom-dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        {renderTrigger ? (
          renderTrigger(selected)
        ) : (
          <span className="custom-dropdown__value">{selected.label}</span>
        )}
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={
            open ? "custom-dropdown__chevron open" : "custom-dropdown__chevron"
          }
        >
          <title>Toggle sort options</title>
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="custom-dropdown__menu"
              role="listbox"
              aria-label={ariaLabel}
              style={{
                position: "fixed",
                top: `${menuPosition.top}px`,
                left:
                  menuPosition.left !== undefined
                    ? `${menuPosition.left}px`
                    : "auto",
                right:
                  menuPosition.right !== undefined
                    ? `${menuPosition.right}px`
                    : "auto",
                minWidth: minMenuWidth,
                zIndex: 1200,
              }}
            >
              {options.map((option) => {
                const isActive = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={
                      isActive
                        ? option.tone === "danger"
                          ? "custom-dropdown__item active danger"
                          : "custom-dropdown__item active"
                        : option.tone === "danger"
                          ? "custom-dropdown__item danger"
                          : "custom-dropdown__item"
                    }
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <span className="custom-dropdown__item-label">
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="custom-dropdown__item-description">
                        {option.description}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
