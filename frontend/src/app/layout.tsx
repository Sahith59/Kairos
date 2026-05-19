import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Kairos — Autonomous Incident Intelligence",
  description:
    "Kairos autonomously detects production anomalies, investigates root causes using a LangGraph multi-agent loop, and delivers validated RCA reports in seconds. Built with FastAPI, LangGraph, ChromaDB, Redis, Neo4j, and Next.js.",
  keywords: [
    "SRE", "AIOps", "LangGraph", "LLM", "root cause analysis", "observability",
    "FastAPI", "Ollama", "Groq", "ChromaDB", "Neo4j", "Redis"
  ],
  authors: [{ name: "Kairos" }],
  openGraph: {
    title: "Kairos — Autonomous Incident Intelligence",
    description: "Autonomous AI root cause analysis for production incidents. LangGraph multi-agent loop with real-time WebSocket streaming.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
