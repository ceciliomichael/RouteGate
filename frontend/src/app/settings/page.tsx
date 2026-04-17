import type { Metadata } from "next";

import { SettingsPageClient } from "../../features/dashboard/pages/SettingsPageClient";

export const metadata: Metadata = {
  title: "Settings — Wildcard Catcher",
  description: "Manage account and terminal settings.",
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
