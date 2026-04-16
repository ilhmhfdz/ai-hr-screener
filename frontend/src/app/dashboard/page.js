"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = api.getUser();
    setUser(u);
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await api.getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCandidates = jobs.reduce((sum, j) => sum + (j.candidate_count || 0), 0);
  const completedScreenings = jobs.filter((j) => j.screening_status === "completed").length;
  const activeJobs = jobs.length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {user?.name?.split(" ")[0] || "User"}
          </h1>
          <p className="page-subtitle">
            Here&apos;s your recruitment screening overview
          </p>
        </div>
        <div className="page-actions">
          <Link href="/dashboard/jobs/new" className="btn btn-primary">
            <svg style={{ marginRight: 6 }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Screening
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Active Jobs</div>
            <div className="stat-value">{activeJobs}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Candidates</div>
            <div className="stat-value">{totalCandidates}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Screenings Done</div>
            <div className="stat-value">{completedScreenings}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Max CVs/Batch</div>
            <div className="stat-value">25</div>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Recent Screening Sessions</h2>
            <p className="card-subtitle">Your latest job screening activities</p>
          </div>
          <Link href="/dashboard/jobs" className="btn btn-secondary btn-sm">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="loading-overlay" style={{ padding: "40px 0" }}>
            <div className="spinner"></div>
            <p className="loading-text">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <h3 className="empty-state-title">No screening sessions yet</h3>
            <p className="empty-state-text">
              Create your first job posting and start screening candidates with AI-powered deep analysis.
            </p>
            <Link href="/dashboard/jobs/new" className="btn btn-primary mt-4">
              Create First Screening
            </Link>
          </div>
        ) : (
          <div className="candidate-list">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="candidate-card"
                onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
              >
                <div className={`candidate-rank ${job.screening_status === "completed" ? "top-3" : "other"}`}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                </div>
                <div className="candidate-info">
                  <div className="candidate-name">{job.title}</div>
                  <div className="candidate-meta">
                    {job.candidate_count} candidates •{" "}
                    <span className={`badge ${job.screening_status}`}>
                      {job.screening_status}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="text-sm text-muted">
                    {new Date(job.created_at).toLocaleDateString()}
                  </div>
                  {job.bias_report?.has_bias && (
                    <span className="badge error" style={{ marginTop: 4 }}>Bias Detected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
