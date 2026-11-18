import Link from "next/link";

export default function LoginPage() {
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
        <Link className="button primary demo-link" href="/patient">
          Open Layla&apos;s synthetic demo
        </Link>
        <p className="small muted">
          All sample records are fictional. Demo state is temporary and may reset
          when the server restarts.
        </p>
      </section>
    </main>
  );
}
