"use client";

import { useState, useRef } from "react";
import type { CoreValue } from "@/db/schema";
import { StepBar } from "@/components/ui/StepBar";
import { Button } from "@/components/ui/Button";
import { validateStaff, submitKaizen } from "@/actions/submit-kaizen";
import { MAX_UPLOAD_FILES, MAX_FILE_SIZE_MB } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface SubmitFlowProps {
  coreValues: CoreValue[];
}

type Stage = "validate" | "form" | "success";

export default function SubmitFlow({ coreValues }: SubmitFlowProps) {
  const [stage, setStage] = useState<Stage>("validate");
  const [staffName, setStaffName] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  // ── Step 1 state ─────────────────────────────────────────────────────────────
  const [validateError, setValidateError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  async function handleValidate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidateError(null);
    setIsValidating(true);
    const fd = new FormData(e.currentTarget);
    const result = await validateStaff(fd);
    setIsValidating(false);
    if (result.error) {
      setValidateError(result.error);
      toast.error(result.error);
    } else {
      setStaffName(result.staffName ?? "");
      setStage("form");
      toast.success(`Identity verified. Welcome, ${result.staffName}!`);
    }
  }

  // ── Step 2 state ─────────────────────────────────────────────────────────────
  const [selectedCVs, setSelectedCVs] = useState<string[]>([]);
  const [currentSituation, setCurrentSituation] = useState("");
  const [improvementIdea, setImprovementIdea] = useState("");
  const [expectedBenefit, setExpectedBenefit] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("PROPOSED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleCV(id: string) {
    setSelectedCVs((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    const remaining = MAX_UPLOAD_FILES - files.length;
    const toAdd = newFiles.slice(0, remaining).filter(
      (f) => f.size <= MAX_FILE_SIZE_MB * 1024 * 1024
    );
    setFiles((prev) => [...prev, ...toAdd]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    if (selectedCVs.length === 0) {
      setSubmitError("Please select at least one core value.");
      return;
    }

    setIsSubmitting(true);

    // Upload images
    let imageUrls: string[] = [];
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        setSubmitError("Image upload failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
      const json = await res.json();
      imageUrls = json.urls;
    }

    const result = await submitKaizen({
      coreValueIds: selectedCVs,
      currentSituation,
      improvementIdea,
      expectedBenefit,
      imageUrls,
      status,
    });

    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      toast.error(result.error);
    } else {
      setReferenceNumber(result.referenceNumber ?? "");
      setStage("success");
      toast.success("Kaizen submitted successfully!");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (stage === "success") {
    return (
      <div className="submit-form-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✅</div>
        <div className="font-semibold" style={{ fontSize: "1.125rem", marginBottom: "0.5rem" }}>
          Submission received!
        </div>
        <p className="text-sub" style={{ marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          Your Kaizen idea has been submitted and will be reviewed by your department manager.
        </p>
        <div
          style={{
            background: "var(--color-brand-50)",
            border: "1px solid var(--color-brand-200)",
            borderRadius: "var(--radius)",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className="text-sub" style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
            Reference number
          </div>
          <div
            className="font-semibold"
            style={{ fontSize: "1.25rem", color: "var(--color-brand)", letterSpacing: "0.04em" }}
          >
            {referenceNumber}
          </div>
          <div className="text-muted" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
            Save this for tracking purposes
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setStage("validate");
            setSelectedCVs([]);
            setCurrentSituation("");
            setImprovementIdea("");
            setExpectedBenefit("");
            setFiles([]);
            setStaffName("");
            setStatus("PROPOSED");
          }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="submit-form-card">
      <StepBar
        steps={["Verify identity", "Submit idea"]}
        currentStep={stage === "validate" ? 0 : 1}
      />

      {/* Step 1 — Validate */}
      {stage === "validate" && (
        <form onSubmit={handleValidate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div className="font-semibold" style={{ marginBottom: "0.25rem" }}>
              Verify your identity
            </div>
            <p className="text-sub" style={{ fontSize: "0.8125rem" }}>
              Enter your Staff ID and email to continue.
            </p>
          </div>

          {validateError && <div className="alert alert-error">{validateError}</div>}

          <div className="field">
            <label htmlFor="staffId">Staff ID</label>
            <input
              id="staffId"
              name="staffId"
              type="text"
              placeholder="e.g. EMP-001"
              required
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
            />
          </div>

          <Button
            id="validate-submit"
            type="submit"
            variant="primary"
            isLoading={isValidating}
            className="w-full"
            style={{ marginTop: "0.25rem" }}
          >
            Continue
          </Button>
        </form>
      )}

      {/* Step 2 — Form */}
      {stage === "form" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div className="font-semibold" style={{ marginBottom: "0.25rem" }}>
              Hello, {staffName} 👋
            </div>
            <p className="text-sub" style={{ fontSize: "0.8125rem" }}>
              Share your improvement idea below. All fields are required unless marked optional.
            </p>
          </div>

          {submitError && <div className="alert alert-error">{submitError}</div>}

          {/* Core values */}
          <div className="field">
            <label>Core value(s) addressed</label>
            <div className="checkbox-group" style={{ marginTop: "0.375rem" }}>
              {coreValues.map((cv) => (
                <label
                  key={cv.id}
                  className={`checkbox-chip${selectedCVs.includes(cv.id) ? " selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    style={{ display: "none" }}
                    checked={selectedCVs.includes(cv.id)}
                    onChange={() => toggleCV(cv.id)}
                  />
                  {cv.name}
                </label>
              ))}
            </div>
          </div>

          {/* Status selection */}
          <div className="field">
            <label htmlFor="idea-status">Status of this idea</label>
            <select
              id="idea-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
            >
              <option value="PROPOSED">Proposed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Implemented (Completed)</option>
            </select>
          </div>

          {/* Text fields */}
          <div className="field">
            <label htmlFor="current-situation">
              Current situation
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: "0.25rem" }}>
                ({currentSituation.length} chars)
              </span>
            </label>
            <textarea
              id="current-situation"
              value={currentSituation}
              onChange={(e) => setCurrentSituation(e.target.value)}
              placeholder="Describe the current problem or situation…"
              required
              minLength={10}
              style={{ minHeight: "6rem" }}
            />
          </div>

          <div className="field">
            <label htmlFor="improvement-idea">
              Improvement idea
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: "0.25rem" }}>
                ({improvementIdea.length} chars)
              </span>
            </label>
            <textarea
              id="improvement-idea"
              value={improvementIdea}
              onChange={(e) => setImprovementIdea(e.target.value)}
              placeholder="Describe your proposed improvement…"
              required
              minLength={10}
              style={{ minHeight: "6rem" }}
            />
          </div>

          <div className="field">
            <label htmlFor="expected-benefit">
              Expected benefit
              <span className="text-muted" style={{ fontWeight: 400, marginLeft: "0.25rem" }}>
                ({expectedBenefit.length} chars)
              </span>
            </label>
            <textarea
              id="expected-benefit"
              value={expectedBenefit}
              onChange={(e) => setExpectedBenefit(e.target.value)}
              placeholder="What improvement or benefit do you expect?…"
              required
              minLength={10}
              style={{ minHeight: "6rem" }}
            />
          </div>

          {/* File upload */}
          <div className="field">
            <label>
              Attachments <span className="text-muted" style={{ fontWeight: 400 }}>(optional, up to {MAX_UPLOAD_FILES})</span>
            </label>
            {files.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2"
                    style={{
                      background: "var(--color-surface-2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius)",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                      <span style={{ fontSize: "1rem", flexShrink: 0 }}>
                        {file.type.startsWith("image/") ? "🖼️" : "📄"}
                      </span>
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", flexGrow: 1 }}>
                        {file.name}
                      </span>
                      <span className="text-muted" style={{ fontSize: "0.75rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        padding: "0 0.25rem",
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_UPLOAD_FILES && (
              <label className="upload-zone" style={{ display: "block", cursor: "pointer" }}>
                <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>📁</div>
                <div style={{ fontSize: "0.8125rem" }}>
                  Click to add attachment{files.length > 0 ? " (up to " + (MAX_UPLOAD_FILES - files.length) + " more)" : "s"}
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Max {MAX_FILE_SIZE_MB}MB each · PDF, DOCX, XLSX, images
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStage("validate")}
              style={{ flex: "0 0 auto" }}
            >
              ← Back
            </Button>
            <Button
              id="submit-kaizen"
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full"
            >
              Submit Kaizen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
