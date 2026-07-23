"use client";

import { useEffect, useState } from "react";

type Provider = "veo" | "kling";

export function VideoProviderSetting() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/video-provider")
      .then((res) => res.json())
      .then((data) => setProvider(data.provider))
      .catch(() => {});
  }, []);

  async function handleChange(next: Provider) {
    setSaving(true);
    setProvider(next);
    try {
      await fetch("/api/settings/video-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!provider) return null;

  return (
    <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
      Video:
      <select
        value={provider}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value as Provider)}
        style={{
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "0.2rem 0.4rem",
          background: "var(--background)",
          color: "var(--foreground)",
          fontSize: "0.8rem",
        }}
      >
        <option value="veo">Google Veo 3.1</option>
        <option value="kling">Kling</option>
      </select>
    </label>
  );
}
