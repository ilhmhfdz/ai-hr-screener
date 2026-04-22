"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.login(form);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <ThemeToggle />
      </div>
      <div className="auth-card animate-fade-in">
        {loading && (
          <div className="auth-loading-overlay">
            <div className="pulse-circle">
              <div className="spinner modal-spinner"></div>
            </div>
            <h3 className="loading-title">Waking up server...</h3>
            <p className="loading-subtitle">
              We are using a free Render instance which may take up to 50 seconds to start.
              <br />Please hold on!
            </p>
            <div className="loading-timer">{loadingTime}s elapsed</div>
          </div>
        )}

        <div className="auth-header" style={{ marginBottom: 24 }}>
          <div className="sidebar-logo-icon" style={{ margin: "0 auto 16px" }}>AI</div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && <p className="form-error" style={{ marginBottom: 16 }}>{error}</p>}

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: "12px", marginTop: "8px" }}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
