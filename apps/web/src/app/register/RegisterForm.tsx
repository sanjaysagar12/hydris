"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REGIONS } from "@/lib/types";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loc, setLoc] = useState("");
  const [region, setRegion] = useState("Bangladesh");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, loc, region, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Registration failed");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <div className="auth-field">
        <label htmlFor="name">Facility name</label>
        <input id="name" className="auth-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>

      <div className="auth-field">
        <label htmlFor="loc">Location</label>
        <input id="loc" className="auth-input" placeholder="City, Country" value={loc} onChange={(e) => setLoc(e.target.value)} required />
      </div>

      <div className="auth-field">
        <label htmlFor="region">Region</label>
        <select id="region" className="auth-input" value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.filter((r) => r !== "All").map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          className="auth-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>

      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Creating account…" : "Register"}
      </button>

      <div className="auth-switch">
        Already have an account? <a href="/login">Sign in</a>
      </div>
    </form>
  );
}
