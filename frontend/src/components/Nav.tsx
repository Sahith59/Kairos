"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavProps {
  onIntegrate: () => void;
  onSettings: () => void;
}

export default function Nav({ onIntegrate, onSettings }: NavProps) {
  const pathname = usePathname();

  const links = [
    { label: "Cockpit", href: "/#cockpit" },
    { label: "Agent Mind", href: "/agent" },
    { label: "History", href: "/history" },
    { label: "FAQ", href: "/faq" },
  ];

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 100,
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(3,6,16,0.88)",
      backdropFilter: "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
    }}>
      {/* Wordmark */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: "linear-gradient(135deg, var(--accent) 0%, #7dd3fc 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(79,142,247,0.35)",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 800,
            color: "#fff", fontFamily: "var(--font-mono)",
            letterSpacing: "0.01em",
          }}>KR</span>
        </div>
        <span style={{
          fontSize: 15, fontWeight: 700,
          color: "var(--text-primary)",
          fontFamily: "var(--font-ui)",
          letterSpacing: "-0.02em",
        }}>
          Kairos
        </span>
      </Link>

      {/* Center links */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        {links.map(({ label, href }) => {
          const active = href === "/agent"
            ? pathname === "/agent"
            : href === "/faq"
            ? pathname === "/faq"
            : href === "/history"
            ? pathname === "/history"
            : pathname === "/" || pathname === "";
          return (
            <Link key={href} href={href} style={{
              padding: "5px 14px",
              borderRadius: 8,
              fontSize: 13, fontWeight: active ? 600 : 500,
              fontFamily: "var(--font-ui)",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "rgba(255,255,255,0.06)" : "transparent",
              border: `1px solid ${active ? "rgba(255,255,255,0.09)" : "transparent"}`,
              textDecoration: "none",
              transition: "all 0.15s ease",
              letterSpacing: "-0.01em",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* GitHub */}
        <a
          href="https://github.com/Sahith59/LogSage"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub · Report issues · Open PRs"
          style={{
            padding: "5px 12px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            display: "flex", alignItems: "center", gap: 6,
            textDecoration: "none",
            fontSize: 12, fontWeight: 500,
            fontFamily: "var(--font-ui)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.color = "#f0f6fc";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(240,246,252,0.25)";
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-subtle)";
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>

        {/* Settings gear */}
        <button
          onClick={onSettings}
          title="LLM Settings"
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,142,247,0.35)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,142,247,0.08)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        {/* Integrate button */}
        <button
          onClick={onIntegrate}
          style={{
            padding: "5px 16px",
            borderRadius: 8,
            fontSize: 12, fontWeight: 600,
            fontFamily: "var(--font-ui)",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--accent)",
            border: "1px solid rgba(79,142,247,0.28)",
            background: "rgba(79,142,247,0.07)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,142,247,0.13)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,142,247,0.45)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,142,247,0.07)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,142,247,0.28)";
          }}
        >
          Integrate
        </button>
      </div>
    </nav>
  );
}
