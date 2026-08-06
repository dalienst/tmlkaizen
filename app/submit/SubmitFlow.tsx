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
  const [selectedCVs, setSelectedCVs] = useState<number[]>([]);
  const [currentSituation, setCurrentSituation] = useState("");
  const [improvementIdea, setImprovementIdea] = useState("");
  const [expectedBenefit, setExpectedBenefit] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleCV(id: number) {
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
    setPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
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
            setPreviews([]);
            setStaffName("");
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

          {/* Image upload */}
          <div className="field">
            <label>
              Photos <span className="text-muted" style={{ fontWeight: 400 }}>(optional, up to {MAX_UPLOAD_FILES})</span>
            </label>
            {previews.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {previews.map((url, i) => (
                  <div
                    key={i}
                    style={{ position: "relative", width: "5rem", height: "5rem" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "var(--radius)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      style={{
                        position: "absolute",
                        top: "-0.375rem",
                        right: "-0.375rem",
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "9999px",
                        background: "var(--color-danger)",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.625rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
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
                <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>📷</div>
                <div style={{ fontSize: "0.8125rem" }}>
                  Click to add photo{files.length > 0 ? " (up to " + (MAX_UPLOAD_FILES - files.length) + " more)" : "s"}
                </div>
                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                  Max {MAX_FILE_SIZE_MB}MB each · JPG, PNG, WEBP
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
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
