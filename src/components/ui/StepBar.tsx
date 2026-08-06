interface StepBarProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export function StepBar({ steps, currentStep }: StepBarProps) {
  return (
    <div className="step-bar">
      {steps.map((label, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        return (
          <div key={i} style={{ display: "contents" }}>
            <div
              className={`step-bar__item${isActive ? " active" : ""}${isDone ? " done" : ""}`}
            >
              <div className="step-bar__dot">
                {isDone ? "✓" : i + 1}
              </div>
              <span>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="step-bar__connector" />
            )}
          </div>
        );
      })}
    </div>
  );
}
