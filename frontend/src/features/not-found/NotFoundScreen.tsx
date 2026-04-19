import type { CSSProperties } from "react";

const rootStyle: CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 16,
  textAlign: "center",
  color: "var(--color-ink)",
  lineHeight: 1.5,
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  background:
    "radial-gradient(circle at top, rgba(16, 16, 17, 0.08), transparent 32%), linear-gradient(180deg, var(--color-surface-muted) 0%, #fbfbfd 58%, #f6f7fa 100%)",
};

const shellStyle: CSSProperties = {
  width: "min(100%, 36rem)",
  display: "grid",
  justifyItems: "center",
  gap: "0.8rem",
};

const eyebrowStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.75rem",
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--color-ink-muted)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(2.4rem, 8vw, 4.8rem)",
  lineHeight: 0.98,
  letterSpacing: "-0.06em",
  color: "var(--color-ink)",
  textWrap: "balance",
};

const bodyStyle: CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  color: "var(--color-ink-secondary)",
};

const noteStyle: CSSProperties = {
  margin: 0,
  fontSize: "0.875rem",
  color: "var(--color-ink-muted)",
};

export function NotFoundScreen() {
  return (
    <main style={rootStyle}>
      <section style={shellStyle} aria-labelledby="not-found-title">
        <p style={eyebrowStyle}>RouteGate</p>
        <h1 id="not-found-title" style={titleStyle}>
          This page does not exist.
        </h1>
        <p style={bodyStyle}>We could not find a page for this request.</p>
        <p style={noteStyle}>
          RouteGate will serve this page again after the upstream is back online.
        </p>
      </section>
    </main>
  );
}
