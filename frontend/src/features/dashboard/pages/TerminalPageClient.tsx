"use client";

import { AuthenticatedPage } from "../AuthenticatedPage";
import { TerminalDashboardPage } from "./TerminalDashboardPage";

export function TerminalPageClient() {
  return (
    <AuthenticatedPage loadingLabel="Loading terminal...">
      {(auth) => <TerminalDashboardPage auth={auth} />}
    </AuthenticatedPage>
  );
}
