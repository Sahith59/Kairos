"use client";

import { useState, useEffect, type ReactNode } from "react";
import Nav from "./Nav";
import IntegrationHub from "./IntegrationHub";
import LLMSettingsDrawer from "./LLMSettingsDrawer";
import { KairosProvider } from "./KairosContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen]       = useState(false);

  useEffect(() => {
    const handler = () => setIntegrationOpen(true);
    window.addEventListener("open-integration-hub", handler);
    return () => window.removeEventListener("open-integration-hub", handler);
  }, []);

  return (
    <KairosProvider>
      <Nav
        onIntegrate={() => setIntegrationOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      <IntegrationHub
        open={integrationOpen}
        onClose={() => setIntegrationOpen(false)}
      />
      <LLMSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      {children}
    </KairosProvider>
  );
}
