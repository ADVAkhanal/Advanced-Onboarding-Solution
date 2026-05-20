"use client";

import { useState } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error?.message ?? "Login failed.");
      setLoading(false);
      return;
    }

    window.location.href = nextPath || "/";
  }

  return (
    <form onSubmit={submit} className="form-grid">
      <label>
        Email
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} />
      </label>
      {error ? <div className="pill red">{error}</div> : null}
      <button className="button primary" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
