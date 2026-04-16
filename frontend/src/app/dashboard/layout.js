"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = api.getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const stored = api.getUser();
    if (stored) setUser(stored);
  }, [router]);

  const handleLogout = () => {
    api.logout();
  };

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
    )},
    { href: "/dashboard/jobs", label: "Screening Jobs", icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
    )},
  ];

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  if (!user) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">AI</div>
            <div className="sidebar-logo-text" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: "16px", fontWeight: 700 }}>HR Screener</div>
              <div style={{ fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>by Your Team</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div style={{ padding: "0 12px 12px", display: "flex", justifyContent: "flex-end" }}>
            <ThemeToggle />
          </div>
          
          <span className="sidebar-section-label">Main Menu</span>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <div style={{ color: isActive(item.href) ? "var(--primary)" : "var(--text-tertiary)" }}>
                {item.icon}
              </div>
              {item.label}
            </Link>
          ))}

          <span className="sidebar-section-label" style={{ marginTop: 24 }}>Actions</span>
          <Link
            href="/dashboard/jobs/new"
            className="nav-link"
            onClick={() => setSidebarOpen(false)}
          >
            <div style={{ color: "var(--text-tertiary)" }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            Create New Job
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Click to logout">
            <div className="sidebar-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
            <div style={{ color: "var(--text-tertiary)" }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 99,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
