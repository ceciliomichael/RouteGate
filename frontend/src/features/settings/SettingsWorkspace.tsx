"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthState } from "../auth/useAuth";
import { GeneralSettingsPanel } from "./GeneralSettingsPanel";
import { TerminalSettingsPanel } from "./TerminalSettingsPanel";

const SECTIONS = ["general", "terminal"] as const;
type SettingsSection = (typeof SECTIONS)[number];

interface SettingsWorkspaceProps {
  auth: AuthState;
}

function isSettingsSection(value: string | null): value is SettingsSection {
  return value === "general" || value === "terminal";
}

function getSectionTitle(section: SettingsSection): string {
  if (section === "terminal") {
    return "Terminal Settings";
  }
  return "General Settings";
}

function getSectionSubtitle(section: SettingsSection): string {
  if (section === "terminal") {
    return "Configure the SSH target used for terminal access.";
  }
  return "Update your profile name and sign-in password.";
}

export function SettingsWorkspace({ auth }: SettingsWorkspaceProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = auth.user;

  if (!user) {
    return null;
  }
  const rawSection = searchParams.get("section");
  const section = isSettingsSection(rawSection) ? rawSection : "general";

  const selectSection = (next: SettingsSection): void => {
    const nextSearch = new URLSearchParams(searchParams.toString());
    nextSearch.set("section", next);
    router.replace(`${pathname}?${nextSearch.toString()}`);
  };

  return (
    <section className="settings-workspace card">
      <aside className="settings-sidebar">
        <h1 className="settings-sidebar__title">Settings</h1>
        <p className="settings-sidebar__description">
          Configure your account and terminal access.
        </p>
        <nav className="settings-sidebar__nav" aria-label="Settings sections">
          <button
            type="button"
            className={`settings-sidebar__item${section === "general" ? " is-active" : ""}`}
            onClick={() => selectSection("general")}
          >
            General
          </button>
          <button
            type="button"
            className={`settings-sidebar__item${section === "terminal" ? " is-active" : ""}`}
            onClick={() => selectSection("terminal")}
          >
            Terminal
          </button>
        </nav>
      </aside>

      <div className="settings-content">
        <header className="settings-content__header">
          <div className="settings-content__header-copy">
            <h1 className="settings-content__title">
              {getSectionTitle(section)}
            </h1>
            <p className="settings-content__subtitle">
              {getSectionSubtitle(section)}
            </p>
          </div>
        </header>

        <div className="settings-content__body">
          {section === "general" ? (
            <GeneralSettingsPanel user={user} onProfileChanged={auth.refresh} />
          ) : (
            <TerminalSettingsPanel />
          )}
        </div>
      </div>
    </section>
  );
}
