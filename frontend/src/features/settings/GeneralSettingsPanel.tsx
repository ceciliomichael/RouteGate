"use client";

import { useEffect, useState } from "react";
import type { AuthUser } from "../auth/types";
import {
  changeCurrentUserPassword,
  updateCurrentUserProfile,
} from "../users/api";

interface GeneralSettingsPanelProps {
  user: AuthUser;
  onProfileChanged: () => Promise<void>;
}

export function GeneralSettingsPanel({
  user,
  onProfileChanged,
}: GeneralSettingsPanelProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isBootstrapAdmin = user.isBootstrap;

  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  const handleSaveProfile = async (): Promise<void> => {
    setProfileError(null);
    setProfileMessage(null);

    if (isBootstrapAdmin) {
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setProfileError("Name is required.");
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateCurrentUserProfile({ name: trimmedName });
      await onProfileChanged();
      setProfileMessage("Profile updated.");
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    setPasswordError(null);
    setPasswordMessage(null);

    if (isBootstrapAdmin) {
      return;
    }

    if (currentPassword.trim().length === 0) {
      setPasswordError("Current password is required.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsSavingPassword(true);
    try {
      await changeCurrentUserPassword({
        currentPassword,
        newPassword,
      });
      await onProfileChanged();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Failed to update password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <section className="settings-section">
      <header className="settings-section__header">
        <h2 className="settings-section__title">General</h2>
        <p className="settings-section__description">
          Update your display name and sign-in password.
        </p>
      </header>

      <fieldset
        className="settings-fieldset"
        disabled={isBootstrapAdmin || isSavingProfile}
      >
        <label className="field">
          <span className="field-label">Display Name</span>
          <input
            className="field-input"
            type="text"
            value={name}
            disabled={isBootstrapAdmin || isSavingProfile}
            readOnly={isBootstrapAdmin}
            aria-readonly={isBootstrapAdmin}
            placeholder="e.g. Operations Admin"
            onChange={(event) => {
              setName(event.target.value);
              setProfileError(null);
              setProfileMessage(null);
            }}
          />
          <span className="field-hint">
            This name is shown in the top-right profile menu.
          </span>
        </label>

        <div className="settings-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isBootstrapAdmin || isSavingProfile}
            onClick={() => void handleSaveProfile()}
          >
            {isSavingProfile ? "Saving..." : "Save Profile"}
          </button>
          {profileMessage ? (
            <span className="settings-message">{profileMessage}</span>
          ) : null}
          {profileError ? (
            <span className="settings-error">{profileError}</span>
          ) : null}
        </div>
      </fieldset>

      <div className="settings-divider" />

      <fieldset
        className="settings-fieldset"
        disabled={isBootstrapAdmin || isSavingPassword}
      >
        <label className="field">
          <span className="field-label">Current Password</span>
          <input
            className="field-input"
            type="password"
            value={currentPassword}
            disabled={isBootstrapAdmin || isSavingPassword}
            placeholder="Enter your current password"
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setPasswordError(null);
              setPasswordMessage(null);
            }}
          />
          <span className="field-hint">
            Enter your current login password to confirm this change.
          </span>
        </label>

        <label className="field">
          <span className="field-label">New Password</span>
          <input
            className="field-input"
            type="password"
            value={newPassword}
            disabled={isBootstrapAdmin || isSavingPassword}
            placeholder="At least 8 characters"
            onChange={(event) => {
              setNewPassword(event.target.value);
              setPasswordError(null);
              setPasswordMessage(null);
            }}
          />
          <span className="field-hint">Use at least 8 characters.</span>
        </label>

        <label className="field">
          <span className="field-label">Confirm New Password</span>
          <input
            className="field-input"
            type="password"
            value={confirmPassword}
            disabled={isBootstrapAdmin || isSavingPassword}
            placeholder="Re-enter new password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setPasswordError(null);
              setPasswordMessage(null);
            }}
          />
          <span className="field-hint">
            Must match the new password exactly.
          </span>
        </label>

        <div className="settings-actions-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isBootstrapAdmin || isSavingPassword}
            onClick={() => void handleChangePassword()}
          >
            {isSavingPassword ? "Saving..." : "Change Password"}
          </button>
          {passwordMessage ? (
            <span className="settings-message">{passwordMessage}</span>
          ) : null}
          {passwordError ? (
            <span className="settings-error">{passwordError}</span>
          ) : null}
        </div>
      </fieldset>
    </section>
  );
}
