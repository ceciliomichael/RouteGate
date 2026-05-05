package proxy

import (
	"html/template"
	"net/http"
)

type maintenancePageData struct {
	RequestedHost string
}

var maintenancePageTemplate = template.Must(template.New("maintenance-page").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>503 - Service temporarily unavailable</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #101011;
      --ink-secondary: #606266;
      --ink-muted: #9a9ca2;
      --surface-muted: #f7f8fc;
    }

    * { box-sizing: border-box; }

    html {
      height: 100%;
    }

    html, body {
      margin: 0;
      min-height: 100%;
      width: 100%;
    }

    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top, rgba(16, 16, 17, 0.08), transparent 32%),
        linear-gradient(180deg, var(--surface-muted) 0%, #fbfbfd 58%, #f6f7fa 100%);
      line-height: 1.5;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 16px;
      overflow-x: hidden;
    }

    main {
      width: min(100%, 36rem);
      max-width: calc(100vw - 32px);
      display: grid;
      justify-items: center;
      gap: 0.8rem;
      place-items: center;
      text-align: center;
    }

    .shell {
      width: 100%;
      display: grid;
      justify-items: center;
      gap: 0.8rem;
    }

    .eyebrow {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-muted);
    }

    h1 {
      margin: 0;
      max-width: 100%;
      font-size: clamp(1.45rem, 7vw, 4.8rem);
      line-height: 0.98;
      letter-spacing: -0.06em;
      text-align: center;
    }

    .heading-line {
      display: block;
    }

    .nowrap {
      white-space: nowrap;
    }

    .host {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    p {
      margin: 0;
      font-size: 1rem;
      color: var(--ink-secondary);
    }

    .note {
      font-size: 0.875rem;
      color: var(--ink-muted);
    }

    @media (min-width: 640px) {
      .shell {
        gap: 0.9rem;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="shell" aria-labelledby="maintenance-title">
      <p class="eyebrow">RouteGate</p>
      <h1 id="maintenance-title">
        <span class="heading-line">This destination</span>
        <span class="heading-line nowrap">is temporarily unavailable.</span>
      </h1>
      <p>
        We could not connect to the destination for <strong class="host">{{.RequestedHost}}</strong>.
      </p>
      <p class="note">
        RouteGate will serve this subdomain again after the upstream is back online.
      </p>
    </section>
  </main>
</body>
</html>`))

func (h *Handler) writeMaintenancePage(
	writer http.ResponseWriter,
	host string,
) {
	data := maintenancePageData{RequestedHost: host}

	writer.Header().Set("Content-Type", "text/html; charset=utf-8")
	writer.Header().Set("Cache-Control", "no-store")
	writer.Header().Set("X-Robots-Tag", "noindex, nofollow")
	writer.WriteHeader(http.StatusServiceUnavailable)

	if err := maintenancePageTemplate.Execute(writer, data); err != nil {
		http.Error(writer, "upstream unavailable", http.StatusServiceUnavailable)
	}
}
