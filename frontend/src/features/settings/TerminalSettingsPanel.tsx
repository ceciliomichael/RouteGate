"use client";

import { useEffect, useState } from "react";
import {
  clearSshTerminalTarget,
  fetchSshTerminalTarget,
  saveSshTerminalTarget,
} from "../terminal/sshTargetApi";

export function TerminalSettingsPanel() {
  const [username, setUsername] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTarget = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const target = await fetchSshTerminalTarget();
        if (!isMounted) {
          return;
        }

        if (target) {
          setUsername(target.username);
          setHost(target.host);
          setPort(target.port ? String(target.port) : "");
        } else {
          setUsername("");
          setHost("");
          setPort("");
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load terminal target.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTarget();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async (): Promise<void> => {
    setMessage(null);
    setError(null);

    const trimmedPort = port.trim();
    const parsedPort =
      trimmedPort.length === 0 ? null : Number.parseInt(trimmedPort, 10);
    if (parsedPort !== null && Number.isNaN(parsedPort)) {
      setError("Port must be a number.");
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveSshTerminalTarget({
        username,
        host,
        port: parsedPort,
        password: password.trim().length > 0 ? password : null,
      });
      setUsername(saved.username);
      setHost(saved.host);
      setPort(saved.port ? String(saved.port) : "");
      setPassword("");
      setMessage("Terminal target saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save terminal target.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async (): Promise<void> => {
    setMessage(null);
    setError(null);
    setIsClearing(true);
    try {
      await clearSshTerminalTarget();
      setUsername("");
      setHost("");
      setPort("");
      setPassword("");
      setMessage("Terminal target cleared.");
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to clear terminal target.",
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="settings-section">
      <header className="settings-section__header">
        <h2 className="settings-section__title">Terminal</h2>
        <p className="settings-section__description">
          Save SSH credentials once. Terminal sessions will reconnect using this
          target.
        </p>
      </header>

      <div className="settings-form-grid">
        <label className="field">
          <span className="field-label">SSH Username</span>
          <input
            className="field-input"
            type="text"
            value={username}
            disabled={isLoading || isSaving || isClearing}
            onChange={(event) => {
              setUsername(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="root"
          />
          <span className="field-hint">
            Linux account username used for SSH login.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Host / IP / URL</span>
          <input
            className="field-input"
            type="text"
            value={host}
            disabled={isLoading || isSaving || isClearing}
            onChange={(event) => {
              setHost(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="192.168.1.10 or ssh://server.example.com:2222"
          />
          <span className="field-hint">
            Accepts hostname, IP address, or an SSH URL.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Port (Optional)</span>
          <input
            className="field-input"
            type="text"
            value={port}
            disabled={isLoading || isSaving || isClearing}
            onChange={(event) => {
              setPort(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="22"
            inputMode="numeric"
          />
          <span className="field-hint">
            Leave empty to use the default SSH port 22.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Password (Optional)</span>
          <input
            className="field-input"
            type="password"
            value={password}
            disabled={isLoading || isSaving || isClearing}
            onChange={(event) => {
              setPassword(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="Leave blank to clear saved password"
          />
          <span className="field-hint">
            If empty, password auth is cleared and terminal will prompt or use
            key-based auth.
          </span>
        </label>

        <div className="settings-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isLoading || isSaving || isClearing}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={isLoading || isSaving || isClearing}
            onClick={() => void handleClear()}
          >
            {isClearing ? "Clearing..." : "Clear"}
          </button>
          {message ? <span className="settings-message">{message}</span> : null}
          {error ? <span className="settings-error">{error}</span> : null}
        </div>
      </div>
    </section>
  );
}
