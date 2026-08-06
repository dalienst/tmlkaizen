import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Reset Password | Kaizen Tracker",
  description: "Reset or request a new password for your Kaizen Tracker account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Kaizen Tracker</div>
        <div className="auth-card__title" style={{ marginTop: "1.25rem" }}>
          Reset your password
        </div>
        <p className="auth-card__subtitle" style={{ marginBottom: "1.25rem" }}>
          Tamarind management account
        </p>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
