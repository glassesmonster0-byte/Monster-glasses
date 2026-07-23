"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-secondary" style={{ padding: "0.3rem 0.7rem" }} onClick={handleLogout}>
      Çıkış
    </button>
  );
}
