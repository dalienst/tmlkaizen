import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign In | Kaizen Tracker",
  description: "Sign in to your Kaizen Tracker management account.",
};

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">Kaizen Tracker</div>
        <div className="auth-card__title" style={{ marginTop: "1.25rem" }}>
          Sign in to your account
        </div>
        <p className="auth-card__subtitle">Management portal</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
