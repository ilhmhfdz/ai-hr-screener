"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this job and all associated data?")) return;
    try {
      await api.deleteJob(id);
      setJobs(jobs.filter((j) => j.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Screening Jobs</h1>
          <p className="page-subtitle">Manage all your active recruitment sessions</p>
        </div>
        <div className="page-actions">
          <Link href="/dashboard/jobs/new" className="btn btn-primary">
            <svg style={{ marginRight: 6 }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Job
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p className="loading-text">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
            </div>
            <h3 className="empty-state-title">No jobs found</h3>
            <p className="empty-state-text">You haven&apos;t created any screening jobs yet.</p>
            <Link href="/dashboard/jobs/new" className="btn btn-primary">
              Create First Job
            </Link>
          </div>
        </div>
      ) : (
        <div className="candidate-list">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="candidate-card"
              onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
            >
              <div className="candidate-info">
                <div className="candidate-name">{job.title}</div>
                <div className="candidate-meta">
                  <span className="badge processing" style={{ marginRight: 8 }}>
                    {job.screening_status}
                  </span>
                  <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>
                  {job.bias_report?.has_bias && (
                    <span className="badge error" style={{ marginLeft: 8 }}>Bias Detected</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => handleDelete(job.id, e)}
                  title="Delete Job"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
