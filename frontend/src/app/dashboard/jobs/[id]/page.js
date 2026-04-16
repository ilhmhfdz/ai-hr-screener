"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import api from "@/lib/api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

function getScoreClass(score) {
  if (score >= 80) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "average";
  return "poor";
}

function getRecLabel(rec) {
  const map = {
    strongly_recommended: "⭐ Strongly Recommended",
    recommended: "✅ Recommended",
    maybe: "Maybe",
    not_recommended: "❌ Not Recommended",
  };
  return map[rec] || rec;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [screening, setScreening] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      const [jobData, candidatesData] = await Promise.all([
        api.getJob(jobId),
        api.getCandidates(jobId),
      ]);
      setJob(jobData);
      setCandidates(candidatesData);

      if (jobData.screening_status === "completed") {
        const res = await api.getResults(jobId);
        setResults(res);
        setActiveTab("results");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 25) {
      setUploadError("Maximum 25 CVs per batch");
      return;
    }
    setFiles(selected);
    setUploadError("");
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files || []);
    const pdfFiles = dropped.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfFiles.length > 25) {
      setUploadError("Maximum 25 CVs per batch");
      return;
    }
    setFiles(pdfFiles);
    setUploadError("");
  }, []);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError("");
    try {
      const uploaded = await api.uploadCandidates(jobId, files);
      setCandidates((prev) => [...uploaded, ...prev]);
      setFiles([]);
      setJob((prev) => ({
        ...prev,
        candidate_count: (prev?.candidate_count || 0) + uploaded.length,
      }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleScreen = async () => {
    setScreening(true);
    try {
      const res = await api.triggerScreening(jobId);
      setResults(res);
      setJob((prev) => ({ ...prev, screening_status: "completed" }));
      setActiveTab("results");
    } catch (err) {
      alert(err.message);
    } finally {
      setScreening(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await api.downloadReport(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `screening_report_${job?.title || "report"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download report: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner"></div>
        <p className="loading-text">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <h3 className="empty-state-title">Job not found</h3>
        <button onClick={() => router.push("/dashboard/jobs")} className="btn btn-primary">
          Back to Jobs
        </button>
      </div>
    );
  }

  const parsedCandidates = candidates.filter((c) => c.status === "parsed" || c.status === "scored");

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{job.title}</h1>
          <p className="page-subtitle">
            {job.candidate_count} candidates •{" "}
            <span className={`badge ${job.screening_status}`}>{job.screening_status}</span>
          </p>
        </div>
        <div className="page-actions">
          {results && (
            <button onClick={handleDownloadReport} className="btn btn-secondary">
              📥 Download PDF
            </button>
          )}
          {parsedCandidates.length > 0 && (
            <button
              onClick={handleScreen}
              className="btn btn-primary"
              disabled={screening}
            >
              {screening ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                  Screening...
                </>
              ) : (
                "🧠 Run AI Screening"
              )}
            </button>
          )}
        </div>
      </div>

      {/* Screening Progress Overlay */}
      {screening && (
        <div className="card" style={{ marginBottom: 24, textAlign: "center", padding: 40 }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          <h3 style={{ color: "var(--primary-light)", marginBottom: 8 }}>
            🧠 AI Screening in Progress
          </h3>
          <p className="text-muted">
            Analyzing {parsedCandidates.length} candidates with GPT-4o...
            <br />
            This may take 1-3 minutes depending on the number of CVs.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
          Overview
        </button>
        <button className={`tab ${activeTab === "candidates" ? "active" : ""}`} onClick={() => setActiveTab("candidates")}>
          Candidates ({candidates.length})
        </button>
        <button className={`tab ${activeTab === "results" ? "active" : ""}`} onClick={() => setActiveTab("results")}>
          Results
        </button>
        <button className={`tab ${activeTab === "bias" ? "active" : ""}`} onClick={() => setActiveTab("bias")}>
          Bias Report
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* JD Preview */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 16 }}>Job Description</h3>
            <div style={{
              maxHeight: 400,
              overflow: "auto",
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}>
              {job.description_text?.substring(0, 3000) || "No description"}
            </div>
          </div>

          {/* Requirements & Rubric */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Extracted Requirements */}
            {job.requirements && (
              <div className="card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Extracted Requirements</h3>
                {job.requirements.required_skills?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="text-xs font-bold" style={{ marginBottom: 6, color: "var(--text-tertiary)" }}>
                      Required Skills
                    </div>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {job.requirements.required_skills.map((s, i) => (
                        <span key={i} className="badge completed">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {job.requirements.preferred_skills?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div className="text-xs font-bold" style={{ marginBottom: 6, color: "var(--text-tertiary)" }}>
                      Preferred Skills
                    </div>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {job.requirements.preferred_skills.map((s, i) => (
                        <span key={i} className="badge pending">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {job.requirements.min_experience_years && (
                  <p className="text-sm" style={{ marginTop: 8 }}>
                    Experience: {job.requirements.min_experience_years}
                    {job.requirements.max_experience_years ? `-${job.requirements.max_experience_years}` : "+"} years
                  </p>
                )}
              </div>
            )}

            {/* Rubric */}
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>Scoring Rubric</h3>
              {[
                { label: "Skills", value: job.rubric?.skill_weight || 35 },
                { label: "Experience", value: job.rubric?.experience_weight || 30 },
                { label: "Culture Fit", value: job.rubric?.culture_fit_weight || 20 },
                { label: "Red Flags", value: job.rubric?.red_flags_weight || 15 },
              ].map((item) => (
                <div key={item.label} className="dimension-bar">
                  <div className="dimension-bar-header">
                    <span className="dimension-bar-label">{item.label}</span>
                    <span className="dimension-bar-score">{item.value}%</span>
                  </div>
                  <div className="dimension-bar-track">
                    <div
                      className={`dimension-bar-fill ${getScoreClass(item.value)}`}
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "candidates" && (
        <div>
          {/* Upload Zone */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 className="card-title" style={{ marginBottom: 16 }}>Upload CVs (Max 25 per batch)</h3>
            <div
              className="file-upload-zone"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
                className="file-upload-input"
                onChange={handleFileSelect}
              />
              <div className="file-upload-icon">📤</div>
              <div className="file-upload-text">
                Drop CV PDFs here or click to browse
              </div>
              <div className="file-upload-hint">
                Supports PDF files only • Max 25 files per batch
              </div>
            </div>

            {files.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span className="text-sm font-bold">{files.length} file(s) selected</span>
                  <button
                    onClick={() => setFiles([])}
                    className="btn btn-ghost btn-sm"
                  >
                    Clear all
                  </button>
                </div>
                <div className="uploaded-files">
                  {files.map((f, i) => (
                    <div key={i} className="uploaded-file-item">
                      <div className="uploaded-file-info">
                        <span className="uploaded-file-icon">📄</span>
                        <span>{f.name}</span>
                      </div>
                      <span className="text-xs text-muted">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
                {uploadError && <p className="form-error mt-4">{uploadError}</p>}
                <button
                  onClick={handleUpload}
                  className="btn btn-primary mt-4"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span>
                      Uploading & Parsing...
                    </>
                  ) : (
                    `Upload & Parse ${files.length} CV(s)`
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Candidate List */}
          {candidates.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                Uploaded Candidates ({candidates.length})
              </h3>
              <div className="candidate-list">
                {candidates.map((c) => (
                  <div key={c.id} className="candidate-card" onClick={() => setSelectedCandidate(c)}>
                    <div className={`candidate-rank ${c.status === "parsed" ? "top-3" : "other"}`}>
                      {c.status === "error" ? "❌" : "👤"}
                    </div>
                    <div className="candidate-info">
                      <div className="candidate-name">
                        {c.profile?.name || c.filename}
                      </div>
                      <div className="candidate-meta">
                        {c.filename} •{" "}
                        <span className={`badge ${c.status}`}>{c.status}</span>
                        {c.profile?.skills?.length > 0 && (
                          <span style={{ marginLeft: 8 }}>
                            {c.profile.skills.slice(0, 3).join(", ")}
                            {c.profile.skills.length > 3 && ` +${c.profile.skills.length - 3}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {c.profile?.total_experience_years && (
                      <span className="text-sm text-muted">
                        {c.profile.total_experience_years}y exp
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Detail Modal */}
          {selectedCandidate && (
            <div className="modal-overlay" onClick={() => setSelectedCandidate(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                  <h3 className="modal-title">
                    {selectedCandidate.profile?.name || selectedCandidate.filename}
                  </h3>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedCandidate(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="modal-body">
                  {selectedCandidate.profile ? (
                    <>
                      <p style={{ marginBottom: 16, color: "var(--text-secondary)", fontStyle: "italic" }}>
                        {selectedCandidate.profile.summary}
                      </p>

                      {selectedCandidate.profile.email && (
                        <p className="text-sm mb-4">📧 {selectedCandidate.profile.email}</p>
                      )}

                      <h4 style={{ marginBottom: 8, color: "var(--primary-light)" }}>Skills</h4>
                      <div className="flex gap-2 mb-6" style={{ flexWrap: "wrap" }}>
                        {selectedCandidate.profile.skills?.map((s, i) => (
                          <span key={i} className="badge completed">{s}</span>
                        ))}
                      </div>

                      <h4 style={{ marginBottom: 8, color: "var(--primary-light)" }}>Work Experience</h4>
                      {selectedCandidate.profile.work_experience?.map((exp, i) => (
                        <div key={i} style={{
                          padding: 12,
                          background: "var(--bg-elevated)",
                          borderRadius: 8,
                          marginBottom: 8,
                        }}>
                          <div className="font-bold">{exp.title}</div>
                          <div className="text-sm text-muted">{exp.company} • {exp.start_date} - {exp.end_date}</div>
                          <div className="text-sm" style={{ marginTop: 4, color: "var(--text-secondary)" }}>
                            {exp.description}
                          </div>
                        </div>
                      ))}

                      <h4 style={{ marginTop: 16, marginBottom: 8, color: "var(--primary-light)" }}>Education</h4>
                      {selectedCandidate.profile.education?.map((edu, i) => (
                        <div key={i} className="text-sm" style={{ marginBottom: 4 }}>
                          🎓 {edu.degree} in {edu.field_of_study} — {edu.institution} ({edu.year})
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-muted">Profile extraction failed for this candidate.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "results" && (
        <div>
          {!results || results.results?.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </div>
                <h3 className="empty-state-title">No results yet</h3>
                <p className="empty-state-text">
                  Upload CVs and run AI screening to see ranked results.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Ranking Chart */}
              <div className="card" style={{ marginBottom: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 16 }}>Candidate Ranking</h3>
                <Plot
                  data={[
                    {
                      type: "bar",
                      orientation: "h",
                      y: results.results.map((r) => r.candidate_name).reverse(),
                      x: results.results.map((r) => r.overall_score).reverse(),
                      marker: {
                        color: results.results.map((r) => {
                          if (r.overall_score >= 80) return "#10b981";
                          if (r.overall_score >= 65) return "#3b82f6";
                          if (r.overall_score >= 45) return "#f59e0b";
                          return "#ef4444";
                        }).reverse(),
                        line: { width: 0 },
                      },
                      text: results.results.map((r) => `${r.overall_score.toFixed(0)}`).reverse(),
                      textposition: "outside",
                      textfont: { color: "#94a3b8", size: 12 },
                      hovertemplate: "%{y}: %{x:.1f}/100<extra></extra>",
                    },
                  ]}
                  layout={{
                    height: Math.max(300, results.results.length * 50),
                    margin: { l: 150, r: 60, t: 10, b: 30 },
                    paper_bgcolor: "transparent",
                    plot_bgcolor: "transparent",
                    xaxis: {
                      range: [0, 105],
                      gridcolor: "rgba(99, 102, 241, 0.08)",
                      tickfont: { color: "#64748b", size: 11 },
                      title: { text: "Overall Score", font: { color: "#64748b", size: 12 } },
                    },
                    yaxis: {
                      tickfont: { color: "#f1f5f9", size: 12 },
                      automargin: true,
                    },
                    font: { family: "Inter, sans-serif" },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Results List */}
              <div className="candidate-list">
                {results.results.map((r, idx) => (
                  <div key={r.candidate_id} className="card" style={{ marginBottom: 16 }}>
                    <div className="flex items-center gap-4" style={{ marginBottom: 16 }}>
                      <div className={`candidate-rank ${idx < 3 ? "top-3" : "other"}`}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="candidate-name" style={{ fontSize: 18 }}>{r.candidate_name}</div>
                        <div className="candidate-meta">{r.candidate_filename}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className={`candidate-overall`} style={{ color: `var(--${getScoreClass(r.overall_score) === "excellent" ? "success" : getScoreClass(r.overall_score) === "good" ? "info" : getScoreClass(r.overall_score) === "average" ? "warning" : "danger"})` }}>
                          {r.overall_score.toFixed(0)}
                        </div>
                        <span className={`rec-tag ${r.recommendation}`}>
                          {getRecLabel(r.recommendation)}
                        </span>
                      </div>
                    </div>

                    {/* Dimension Bars + Radar */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, marginBottom: 16 }}>
                      <div>
                        {[
                          { label: "🎯 Skill Match", score: r.skill_match?.score || 0 },
                          { label: "💼 Experience", score: r.experience_relevance?.score || 0 },
                          { label: "🤝 Culture Fit", score: r.culture_fit?.score || 0 },
                          { label: "🚩 Red Flags", score: r.red_flags?.score || 0 },
                        ].map((dim) => (
                          <div key={dim.label} className="dimension-bar">
                            <div className="dimension-bar-header">
                              <span className="dimension-bar-label">{dim.label}</span>
                              <span className={`dimension-bar-score`} style={{ color: `var(--${getScoreClass(dim.score) === "excellent" ? "success" : getScoreClass(dim.score) === "good" ? "info" : getScoreClass(dim.score) === "average" ? "warning" : "danger"})` }}>
                                {dim.score.toFixed(0)}/100
                              </span>
                            </div>
                            <div className="dimension-bar-track">
                              <div
                                className={`dimension-bar-fill ${getScoreClass(dim.score)}`}
                                style={{ width: `${dim.score}%` }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Mini Radar Chart */}
                      <Plot
                        data={[
                          {
                            type: "scatterpolar",
                            r: [
                              r.skill_match?.score || 0,
                              r.experience_relevance?.score || 0,
                              r.culture_fit?.score || 0,
                              r.red_flags?.score || 0,
                              r.skill_match?.score || 0,
                            ],
                            theta: ["Skills", "Experience", "Culture", "Red Flags", "Skills"],
                            fill: "toself",
                            fillcolor: "rgba(99, 102, 241, 0.15)",
                            line: { color: "#6366f1", width: 2 },
                            marker: { size: 6, color: "#818cf8" },
                          },
                        ]}
                        layout={{
                          width: 260,
                          height: 220,
                          margin: { l: 40, r: 40, t: 20, b: 20 },
                          paper_bgcolor: "transparent",
                          plot_bgcolor: "transparent",
                          polar: {
                            bgcolor: "transparent",
                            radialaxis: {
                              visible: true,
                              range: [0, 100],
                              gridcolor: "rgba(99, 102, 241, 0.1)",
                              tickfont: { color: "#475569", size: 9 },
                            },
                            angularaxis: {
                              tickfont: { color: "#94a3b8", size: 10 },
                              gridcolor: "rgba(99, 102, 241, 0.1)",
                            },
                          },
                          showlegend: false,
                          font: { family: "Inter, sans-serif" },
                        }}
                        config={{ displayModeBar: false }}
                      />
                    </div>

                    {/* XAI Explanation */}
                    <div className="xai-container">
                      <div className="xai-summary">{r.xai_summary}</div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                        {/* Positives */}
                        <div className="xai-section">
                          <div className="xai-section-title positive">✅ Strengths</div>
                          <ul className="xai-list">
                            {[
                              ...(r.skill_match?.positives || []),
                              ...(r.experience_relevance?.positives || []),
                            ].slice(0, 4).map((p, i) => (
                              <li key={i} className="xai-list-item">
                                <span style={{ color: "var(--success)" }}>+</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Negatives */}
                        <div className="xai-section">
                          <div className="xai-section-title negative">Gaps</div>
                          <ul className="xai-list">
                            {[
                              ...(r.skill_match?.negatives || []),
                              ...(r.experience_relevance?.negatives || []),
                            ].slice(0, 4).map((n, i) => (
                              <li key={i} className="xai-list-item">
                                <span style={{ color: "var(--warning)" }}>−</span> {n}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Red Flags */}
                        <div className="xai-section">
                          <div className="xai-section-title red-flag">🚩 Red Flags</div>
                          <ul className="xai-list">
                            {r.red_flags?.flags?.length > 0 ? (
                              r.red_flags.flags.map((f, i) => (
                                <li key={i} className="xai-list-item">
                                  <span style={{ color: "var(--danger)" }}>!</span>
                                  <span>
                                    <strong style={{ textTransform: "capitalize" }}>
                                      {f.flag_type?.replace("_", " ")}
                                    </strong>
                                    : {f.description}
                                  </span>
                                </li>
                              ))
                            ) : (
                              <li className="xai-list-item">
                                <span style={{ color: "var(--success)" }}>✓</span> No red flags
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "bias" && (
        <div>
          {job.bias_report ? (
            <div className="card">
              <h3 className="card-title" style={{ marginBottom: 16 }}>
                Job Description Bias Analysis
              </h3>

              {/* Score */}
              <div className={`bias-alert ${
                job.bias_report.overall_score >= 80 ? "success" :
                job.bias_report.overall_score >= 50 ? "warning" : "danger"
              }`}>
                <div className="bias-alert-header">
                  <span style={{ fontSize: 32 }}>
                    {job.bias_report.overall_score >= 80 ? "✅" :
                     job.bias_report.overall_score >= 50 ? "Moderate" : "High"}
                  </span>
                  <div>
                    <div className="bias-alert-title">
                      Inclusivity Score: {job.bias_report.overall_score?.toFixed(0)}/100
                    </div>
                    <p className="text-sm">{job.bias_report.summary}</p>
                  </div>
                </div>
              </div>

              {/* Flags */}
              {job.bias_report.flags?.length > 0 ? (
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
                    Detected Bias Issues ({job.bias_report.flags.length})
                  </h4>
                  {job.bias_report.flags.map((flag, i) => (
                    <div key={i} className="bias-flag-item">
                      <div className="flex items-center gap-3" style={{ marginBottom: 4 }}>
                        <span className={`badge ${flag.severity === "high" ? "error" : flag.severity === "medium" ? "pending" : "completed"}`}>
                          {flag.severity}
                        </span>
                        <span className="badge processing">{flag.bias_type}</span>
                      </div>
                      <div className="bias-flag-phrase">
                        &ldquo;{flag.phrase}&rdquo;
                      </div>
                      <div className="bias-flag-explanation">{flag.explanation}</div>
                      <div className="bias-flag-suggestion">
                        💡 Suggested: &ldquo;{flag.suggested_alternative}&rdquo;
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: "40px 0" }}>
                  <div className="empty-state-icon">🎉</div>
                  <h3 className="empty-state-title">No bias detected!</h3>
                  <p className="empty-state-text">
                    Your job description appears to be inclusive and unbiased.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <h3 className="empty-state-title">No bias report available</h3>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
