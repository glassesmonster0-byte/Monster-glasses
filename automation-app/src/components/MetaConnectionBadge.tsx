"use client";

import { useEffect, useState } from "react";

type Status =
  | { connected: true; pageName: string; igUsername: string }
  | { connected: false; error: string }
  | null;

export function MetaConnectionBadge() {
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    fetch("/api/meta/status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false, error: "Kontrol edilemedi" }));
  }, []);

  if (!status) return null;

  return (
    <span className="badge" title={status.connected ? `${status.pageName} / @${status.igUsername}` : status.error}>
      Meta: {status.connected ? `bağlı (${status.pageName})` : "bağlı değil"}
    </span>
  );
}
