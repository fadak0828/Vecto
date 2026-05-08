"use client";

import { createClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm hover:opacity-70 transition-opacity"
      style={{ color: "var(--on-surface-variant)" }}
    >
      로그아웃
    </button>
  );
}
