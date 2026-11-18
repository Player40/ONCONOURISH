import Link from "next/link";
import { authConfig, demoEnabled } from "@/lib/session";
import { enterCaregiverDemo, enterClinicianDemo, enterPatientDemo, signIn } from "./actions";

const loginErrors: Record<string, string> = {
  credentials: "We could not sign you in. Check your email and password, then try again.",
  profile: "Your sign-in worked, but this account has no OncoNourish role yet. Ask the project administrator to link your synthetic account; do not create another account.",
  verify: "We could not verify your OncoNourish access right now. Try again shortly.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-shell">
      <header className="topbar">
        <Link className="brand" href="/">OncoNourish</Link>
        <span className="badge">Synthetic data · not medical advice</span>
      </header>
      <section className="login-card">
        <span className="eyebrow">Patient demo</span>
        <h1>Welcome to OncoNourish</h1>
        <p className="muted">
          Explore the synthetic patient experience. This demo does not sign you in
          or provide medical advice.
        </p>
        <form action={enterPatientDemo}>
          <button className="button primary demo-link" type="submit">
            Open Layla&apos;s synthetic demo
          </button>
        </form>
        {demoEnabled() && <>
          <form action={enterClinicianDemo}>
            <button className="button" type="submit">Open synthetic clinician demo</button>
          </form>
          <form action={enterCaregiverDemo}>
            <button className="button" type="submit">Open synthetic caregiver demo</button>
          </form>
        </>}
        {authConfig() && <form className="clinician-form" action={signIn}>
          <h2>Sign in to your account</h2>
          {error && <p role="alert">{loginErrors[error] ?? loginErrors.credentials}</p>}
          <label>Email <input type="email" name="email" required autoComplete="username" /></label>
          <label>Password <input type="password" name="password" required autoComplete="current-password" /></label>
          <button className="button" type="submit">Sign in</button>
          <p className="small muted">Access is provisioned by the project administrator. Accounts cannot choose or change their own role.</p>
        </form>}
        <p className="small muted">
          All sample records are fictional. Demo state is temporary and may reset
          when the server restarts.
        </p>
      </section>
    </main>
  );
}
