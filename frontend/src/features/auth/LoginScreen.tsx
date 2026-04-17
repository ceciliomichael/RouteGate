"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import type { AuthState } from "./useAuth";

interface LoginScreenProps {
  auth: AuthState;
}

export function LoginScreen({ auth }: LoginScreenProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      return;
    }

    try {
      await auth.login(username.trim(), password);
      router.replace("/");
    } catch {
      // handled in auth state
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at top, rgba(16, 16, 17, 0.08), transparent 42%), linear-gradient(180deg, var(--color-surface-muted) 0%, #fbfbfd 58%, var(--color-brand-light) 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "1rem",
        }}
      >
        <section
          style={{
            display: "grid",
            gap: "1rem",
            minHeight: "calc(100dvh - 2rem)",
          }}
          className="login-layout"
        >
          <div
            style={{
              display: "grid",
              gap: "1.15rem",
              alignContent: "center",
              padding: "1rem 0.25rem",
            }}
          >
            <span
              className="badge badge-brand"
              style={{ width: "fit-content" }}
            >
              RouteGate
            </span>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2.1rem, 6.5vw, 4rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                  color: "var(--color-ink)",
                  maxWidth: "13ch",
                }}
              >
                Manage wildcard routes from one place.
              </h1>
              <p
                style={{
                  margin: 0,
                  maxWidth: "36rem",
                  fontSize: "1.02rem",
                  color: "var(--color-ink-secondary)",
                }}
              >
                Sign in to open your RouteGate dashboard and manage subdomain
                routes, user access, and account settings.
              </p>
            </div>
            <div className="login-highlights">
              <FeatureCard
                title="Route workspace"
                description="Review, add, and update wildcard subdomain routes."
              />
              <FeatureCard
                title="User access"
                description="Keep route management and team access in one place."
              />
              <FeatureCard
                title="Account settings"
                description="Adjust your dashboard, terminal, and profile settings."
              />
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: "1.5rem",
              display: "grid",
              gap: "1.25rem",
              alignSelf: "center",
            }}
          >
            <div style={{ display: "grid", gap: "0.4rem" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "1rem",
                  background: "var(--color-brand-soft)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <title>Sign in</title>
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                </svg>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  letterSpacing: "-0.03em",
                  color: "var(--color-ink)",
                }}
              >
                RouteGate login
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--color-ink-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                Use your username and password to access route management.
              </p>
            </div>

            {auth.error && (
              <div
                role="alert"
                style={{
                  background: "var(--color-error-bg)",
                  border: "1px solid var(--color-error-border)",
                  color: "var(--color-error)",
                  borderRadius: "1rem",
                  padding: "0.85rem 1rem",
                  fontSize: "0.875rem",
                }}
              >
                {auth.error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: "grid", gap: "1rem" }}
              noValidate
            >
              <div>
                <label htmlFor="login-username" className="field-label">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  className="field-input login-field-reset"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  disabled={auth.isLoading}
                />
              </div>

              <div>
                <label htmlFor="login-password" className="field-label">
                  Password
                </label>
                <div className="login-password-field">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="field-input login-field-reset login-password-field__input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={auth.isLoading}
                  />
                  <button
                    type="button"
                    className="login-password-field__toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    disabled={auth.isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", height: "3rem", borderRadius: "999px" }}
                disabled={
                  auth.isLoading || !username.trim() || !password.trim()
                }
              >
                {auth.isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>

      <style>{`
        .login-layout {
          grid-template-columns: 1fr;
        }

        .login-highlights {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        @media (min-width: 900px) {
          .login-layout {
            grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
            gap: 1.5rem;
          }

          .login-highlights {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .login-password-field {
          position: relative;
        }

        .login-field-reset {
          appearance: none;
          -webkit-appearance: none;
          box-shadow: none !important;
          outline: none !important;
        }

        .login-field-reset:focus,
        .login-field-reset:focus-visible,
        .login-field-reset:active {
          box-shadow: none !important;
          outline: none !important;
        }

        .login-password-field__input {
          padding-right: 3rem;
        }

        .login-password-field__toggle {
          appearance: none;
          -webkit-appearance: none;
          position: absolute;
          right: 0.4rem;
          top: 50%;
          transform: translateY(-50%);
          width: 2rem;
          height: 2rem;
          border: 0;
          border-radius: 9999px;
          background: transparent;
          color: var(--color-ink-secondary);
          display: inline-grid;
          place-items: center;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }

        .login-password-field__toggle:hover:not(:disabled) {
          background: var(--color-surface-subtle);
          color: var(--color-ink);
        }

        .login-password-field__toggle::-moz-focus-inner {
          border: 0;
        }

        .login-password-field__toggle:focus,
        .login-password-field__toggle:focus-visible {
          outline: none;
          box-shadow: none;
        }
      `}</style>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "1.2rem",
        padding: "1rem",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <h3
        style={{
          margin: "0 0 0.3rem",
          fontSize: "0.95rem",
          color: "var(--color-ink)",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: "0.82rem",
          color: "var(--color-ink-secondary)",
        }}
      >
        {description}
      </p>
    </article>
  );
}
