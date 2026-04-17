"use client";

import type { AuthState } from "../../auth/useAuth";
import { SettingsWorkspace } from "../../settings/SettingsWorkspace";
import { DashboardFrame } from "../components/DashboardFrame";

interface SettingsDashboardPageProps {
  auth: AuthState;
}

export function SettingsDashboardPage({ auth }: SettingsDashboardPageProps) {
  return (
    <DashboardFrame auth={auth}>
      <SettingsWorkspace auth={auth} />
    </DashboardFrame>
  );
}
