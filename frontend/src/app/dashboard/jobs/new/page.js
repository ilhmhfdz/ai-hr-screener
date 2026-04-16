"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [descText, setDescText] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [inputMethod, setInputMethod] = useState("text"); // text or pdf
  const [rubric, setRubric] = useState({
    skill_weight: 35,
    experience_weight: 30,
    culture_fit_weight: 20,
    red_flags_weight: 15,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rubricTotal = rubric.skill_weight + rubric.experience_weight + rubric.culture_fit_weight + rubric.red_flags_weight;
  const rubricValid = Math.abs(rubricTotal - 100) < 0.5;

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith(".pdf")) {
      setJdFile(file);
      setInputMethod("pdf");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rubricValid) {
      setError("Scoring weights must sum to 100%");
      return;
    }
    if (!title.trim()) {
      setError("Job title is required");
      return;
    }
    if (inputMethod === "text" && !descText.trim()) {
      setError("Job description is required");
      return;
    }
    if (inputMethod === "pdf" && !jdFile) {
      setError("Please upload a JD PDF file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("skill_weight", rubric.skill_weight);
      formData.append("experience_weight", rubric.experience_weight);
      formData.append("culture_fit_weight", rubric.culture_fit_weight);
      formData.append("red_flags_weight", rubric.red_flags_weight);

      if (inputMethod === "text") {
        formData.append("description_text", descText);
      } else if (jdFile) {
        formData.append("jd_file", jdFile);
      }

      const job = await api.createJob(formData);
      router.push(`/dashboard/jobs/${job.id}`);
    } catch (err) {
      setError(err.message || "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create New Screening</h1>
          <p className="page-subtitle">
            Set up a job description and scoring rubric for AI-powered candidate screening
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
          {/* Left - Job Details */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: 20 }}>Job Description</h2>

            <div className="form-group">
              <label className="form-label" htmlFor="job-title">Job Title *</label>
              <input
                id="job-title"
                className="form-input"
                type="text"
                placeholder="e.g. Senior Backend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Input method toggle */}
            <div className="tabs" style={{ marginBottom: 20 }}>
              <button
                type="button"
                className={`tab ${inputMethod === "text" ? "active" : ""}`}
                onClick={() => setInputMethod("text")}
              >
                Paste Text
              </button>
              <button
                type="button"
                className={`tab ${inputMethod === "pdf" ? "active" : ""}`}
                onClick={() => setInputMethod("pdf")}
              >
                Upload PDF
              </button>
            </div>

            {inputMethod === "text" ? (
              <div className="form-group">
                <label className="form-label" htmlFor="job-desc">Job Description *</label>
                <textarea
                  id="job-desc"
                  className="form-textarea"
                  placeholder="Paste the full job description here...&#10;&#10;Include: responsibilities, requirements, qualifications, company culture, etc."
                  value={descText}
                  onChange={(e) => setDescText(e.target.value)}
                  style={{ minHeight: 300 }}
                />
                <p className="form-hint">{descText.length} characters</p>
              </div>
            ) : (
              <div
                className={`file-upload-zone ${jdFile ? "" : ""}`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="file-upload-input"
                  onChange={(e) => setJdFile(e.target.files?.[0] || null)}
                />
                {jdFile ? (
                  <>
                    <div className="file-upload-icon">📄</div>
                    <div className="file-upload-text">{jdFile.name}</div>
                    <div className="file-upload-hint">
                      {(jdFile.size / 1024).toFixed(1)} KB • Click to change
                    </div>
                  </>
                ) : (
                  <>
                    <div className="file-upload-icon">📤</div>
                    <div className="file-upload-text">Drop JD PDF here</div>
                    <div className="file-upload-hint">or click to browse</div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right - Rubric Editor */}
          <div className="card" style={{ height: "fit-content" }}>
            <h2 className="card-title" style={{ marginBottom: 8 }}>Scoring Rubric</h2>
            <p className="card-subtitle" style={{ marginBottom: 24 }}>
              Adjust weights for each scoring dimension
            </p>

            <div className="rubric-editor">
              {[
                { key: "skill_weight", label: "Technical Skills" },
                { key: "experience_weight", label: "Experience" },
                { key: "culture_fit_weight", label: "Culture Fit" },
                { key: "red_flags_weight", label: "Red Flags" },
              ].map(({ key, label }) => (
                <div key={key} className="rubric-slider-group">
                  <div className="rubric-slider-header">
                    <span className="rubric-slider-label">{label}</span>
                    <span className="rubric-slider-value">{rubric[key]}%</span>
                  </div>
                  <input
                    type="range"
                    className="rubric-slider"
                    min="0"
                    max="100"
                    step="5"
                    value={rubric[key]}
                    onChange={(e) =>
                      setRubric({ ...rubric, [key]: parseInt(e.target.value) })
                    }
                  />
                </div>
              ))}

              <div className={`rubric-total ${rubricValid ? "valid" : "invalid"}`}>
                <span>Total</span>
                <span>{rubricTotal}%</span>
              </div>
              {!rubricValid && (
                <p className="form-error">Weights must sum to exactly 100%</p>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              {error && <p className="form-error" style={{ marginBottom: 12 }}>{error}</p>}
              <button
                type="submit"
                className="btn btn-primary btn-lg w-full"
                disabled={loading || !rubricValid}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
                    Analyzing JD...
                  </>
                ) : (
                  "Create & Analyze Job"
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
