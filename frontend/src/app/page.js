"use client";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (api.getToken()) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="animate-fade-in" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav className="landing-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="sidebar-logo-icon">AI</div>
          <span style={{ fontWeight: 800, fontSize: "18px", letterSpacing: "-0.5px" }}>HR Screener</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ThemeToggle />
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Sign In</Link>
              <Link href="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <main className="landing-hero" style={{ flex: 1 }}>
        <div style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid var(--border)", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "24px" }}>
          Next-Generation CV Parsing
        </div>
        
        <h1 className="landing-title">
          Hire Smarter, Not Harder.
        </h1>
        <p className="landing-subtitle">
          Eliminate bias and accelerate your recruitment pipeline with semantic AI screening. Batch process up to 25 CVs instantly and uncover top talent through explainable insights.
        </p>
        
        <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
          <Link href={isLoggedIn ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
            Start Screening Free
          </Link>
          <a href="#features" className="btn btn-secondary btn-lg">
            How it works
          </a>
        </div>

        <div id="features" className="landing-features">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <h3 className="landing-feature-title">Semantic Resumé Parsing</h3>
            <p className="landing-feature-desc">Go beyond keyword matching. Our AI reads resumes contextually, understanding real experience gaps and overlapping skills.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4"></path></svg>
            </div>
            <h3 className="landing-feature-title">Multi-Dimensional Scoring</h3>
            <p className="landing-feature-desc">Adjust metric weights across Technical Skills, Experience, and Culture fit to customize how the AI models rank your talent pool.</p>
          </div>
          <div className="landing-feature-card">
            <div className="landing-feature-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            </div>
            <h3 className="landing-feature-title">Explainable AI (XAI)</h3>
            <p className="landing-feature-desc">No more black box decisions. Get concrete reasoning pointing out candidate strengths, missing criteria, and potential red flags.</p>
          </div>
        </div>
      </main>
      
      <footer style={{ padding: "40px", textAlign: "center", borderTop: "1px solid var(--border)", color: "var(--text-tertiary)", fontSize: "13px" }}>
        © {new Date().getFullYear()} AI HR Screener. Designed for unbiased recruitment.
      </footer>
    </div>
  );
}
