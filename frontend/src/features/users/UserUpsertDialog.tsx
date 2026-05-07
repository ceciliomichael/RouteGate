"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from "react";
import {
  CustomDropdown,
  type DropdownOption,
} from "../../components/CustomDropdown";
import type { UserRole } from "./types";

export interface UserFormValues {
  name: string;
  username: string;
  role: UserRole;
}

interface UserUpsertDialogProps {
  title: string;
  description: string;
  submitLabel: string;
  busyLabel: string;
  initialValues: UserFormValues;
  existingUsernames?: string[];
  checkUsernameAvailability?: (username: string) => Promise<boolean>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

type UsernameAvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

export function UserUpsertDialog({
  title,
  description,
  submitLabel,
  busyLabel,
  initialValues,
  existingUsernames = [],
  checkUsernameAvailability,
  isLoading,
  onClose,
  onSubmit,
}: UserUpsertDialogProps) {
  const roleOptions: DropdownOption<UserRole>[] = [
    {
      value: "user",
      label: "User",
      description: "Can manage routes assigned to their own account.",
    },
    {
      value: "admin",
      label: "Admin",
      description: "Can manage all routes and create additional accounts.",
    },
  ];

  const [name, setName] = useState(initialValues.name);
  const [username, setUsername] = useState(initialValues.username);
  const [role, setRole] = useState<UserRole>(initialValues.role);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailabilityStatus, setUsernameAvailabilityStatus] =
    useState<UsernameAvailabilityStatus>("idle");
  const [touchedName, setTouchedName] = useState(false);
  const [touchedUsername, setTouchedUsername] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const normalizedUsername = username.trim().toLowerCase();
  const hasUsernameInput = normalizedUsername.length > 0;
  const usernameExistsLocally =
    checkUsernameAvailability != null &&
    existingUsernames.some(
      (existingUsername) =>
        existingUsername.trim().toLowerCase() === normalizedUsername,
    );
  const shouldBlockSubmitForUsername =
    checkUsernameAvailability != null &&
    (usernameExistsLocally || usernameAvailabilityStatus !== "available");
  const isUsernameUnavailable =
    usernameExistsLocally || usernameAvailabilityStatus === "unavailable";

  useEffect(() => {
    if (checkUsernameAvailability == null || !hasUsernameInput) {
      setUsernameAvailabilityStatus("idle");
      return;
    }

    let isCanceled = false;
    setUsernameAvailabilityStatus("checking");

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const available = await checkUsernameAvailability(normalizedUsername);
          if (isCanceled) {
            return;
          }
          setUsernameAvailabilityStatus(
            available ? "available" : "unavailable",
          );
        } catch {
          if (isCanceled) {
            return;
          }
          setUsernameAvailabilityStatus("error");
        }
      })();
    }, 250);

    return () => {
      isCanceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [checkUsernameAvailability, hasUsernameInput, normalizedUsername]);

  const nameError = touchedName && !name.trim() ? "Name is required." : null;
  const usernameError = touchedUsername
    ? !hasUsernameInput
      ? "Username is required."
      : isUsernameUnavailable
        ? "Username already exists."
        : null
    : null;
  const usernameAvailability = hasUsernameInput
    ? usernameAvailabilityStatus === "available"
      ? "• Available"
      : isUsernameUnavailable
        ? "• Not available"
        : usernameAvailabilityStatus === "checking"
          ? "Checking availability..."
          : usernameAvailabilityStatus === "error"
            ? "Unable to check availability right now."
            : null
    : null;
  const usernameSubmitError =
    checkUsernameAvailability != null
      ? !hasUsernameInput
        ? "Username is required."
        : usernameExistsLocally
          ? "Username already exists."
          : usernameAvailabilityStatus === "available"
            ? null
            : usernameAvailabilityStatus === "checking"
              ? "Please wait until username availability finishes checking."
              : usernameAvailabilityStatus === "error"
                ? "Unable to confirm username availability right now."
                : "Username must be available before creating the user."
      : null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName || !trimmedUsername) {
      setError("Name and username are required.");
      return;
    }
    if (usernameSubmitError) {
      setError(usernameSubmitError);
      return;
    }

    setError(null);
    try {
      await onSubmit({
        name: trimmedName,
        username: trimmedUsername,
        role,
      });
    } catch (submitError) {
      if (
        submitError &&
        typeof submitError === "object" &&
        "message" in submitError
      ) {
        setError(String((submitError as { message: unknown }).message));
      } else {
        setError("Failed to save user.");
      }
    }
  }

  function handleOverlayKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    /* biome-ignore lint/a11y/useSemanticElements: backdrop click handling needs a non-semantic overlay wrapper */
    <div
      className="overlay"
      onClick={onClose}
      onKeyDown={handleOverlayKeyDown}
      role="button"
      tabIndex={0}
    >
      <div
        className="modal"
        style={{ overflow: "visible" }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--color-border)",
            gap: "1rem",
          }}
        >
          <div>
            <h2
              style={{ margin: 0, fontSize: "1rem", color: "var(--color-ink)" }}
            >
              {title}
            </h2>
            <p
              style={{
                margin: "0.15rem 0 0",
                fontSize: "0.8rem",
                color: "var(--color-ink-secondary)",
              }}
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <title>Close</title>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: "1rem",
            padding: "1.5rem",
            overflow: "visible",
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                background: "var(--color-error-bg)",
                border: "1px solid var(--color-error-border)",
                color: "var(--color-error)",
                borderRadius: "0.85rem",
                padding: "0.8rem 0.9rem",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="user-name" className="field-label">
              Full name
            </label>
            <input
              id="user-name"
              className={`field-input ${nameError ? "error" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Admin"
              disabled={isLoading}
              onBlur={() => setTouchedName(true)}
            />
            {nameError ? <p className="field-error">{nameError}</p> : null}
          </div>

          <div>
            <label htmlFor="user-username" className="field-label">
              Username
            </label>
            <input
              id="user-username"
              className={`field-input mono ${usernameError ? "error" : ""}`}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="jane-admin"
              disabled={isLoading}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onBlur={() => setTouchedUsername(true)}
            />
            {usernameError ? (
              <p className="field-error">{usernameError}</p>
            ) : null}
            {!usernameError && usernameAvailability ? (
              <p
                className="field-hint"
                style={{
                  color: (() => {
                    if (usernameAvailability === "• Available") {
                      return "var(--color-success)";
                    }
                    if (usernameAvailability === "• Not available") {
                      return "var(--color-error)";
                    }
                    return "var(--color-ink-muted)";
                  })(),
                }}
              >
                {usernameAvailability}
              </p>
            ) : null}
          </div>

          <div>
            <span className="field-label">Role</span>
            <CustomDropdown
              ariaLabel="Select user role"
              value={role}
              options={roleOptions}
              onChange={setRole}
              minMenuWidth="100%"
              menuAlign="left"
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isLoading ||
                !name.trim() ||
                !hasUsernameInput ||
                shouldBlockSubmitForUsername ||
                usernameAvailabilityStatus === "checking"
              }
            >
              {isLoading ? busyLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
