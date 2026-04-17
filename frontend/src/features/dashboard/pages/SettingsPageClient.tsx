"use client";

import { AuthenticatedPage } from "../AuthenticatedPage";
import { SettingsDashboardPage } from "./SettingsDashboardPage";

export function SettingsPageClient() {
  return (
    <AuthenticatedPage loadingLabel="Loading settings...">
      {(auth) => <SettingsDashboardPage auth={auth} />}
    </AuthenticatedPage>
  );
}
