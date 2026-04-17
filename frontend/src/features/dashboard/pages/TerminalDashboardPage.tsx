"use client";

import type { AuthState } from "../../auth/useAuth";
import { TerminalWorkspace } from "../../terminal/TerminalWorkspace";
import { DashboardFrame } from "../components/DashboardFrame";

interface TerminalDashboardPageProps {
  auth: AuthState;
}

export function TerminalDashboardPage({ auth }: TerminalDashboardPageProps) {
  const persistenceKey = `wc_terminal_workspace:${auth.user?.id ?? "anonymous"}`;

  return (
    <DashboardFrame auth={auth}>
      <TerminalWorkspace persistenceKey={persistenceKey} />
    </DashboardFrame>
  );
}
