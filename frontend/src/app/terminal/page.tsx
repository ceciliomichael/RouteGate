import type { Metadata } from "next";

import { TerminalPageClient } from "../../features/dashboard/pages/TerminalPageClient";

export const metadata: Metadata = {
  title: "Terminal — RouteGate",
  description: "Open a private shell session inside the dashboard.",
};

export default function TerminalPage() {
  return <TerminalPageClient />;
}
