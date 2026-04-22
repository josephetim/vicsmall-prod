import { getMaintenanceRetryAfterSeconds } from "@/lib/maintenance-mode";

export const dynamic = "force-dynamic";

function renderMaintenanceHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Maintenance</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        background: radial-gradient(circle at top, #fff7ed, #ffffff 35%, #f8fafc 80%);
        color: #0f172a;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .panel {
        width: min(680px, 100%);
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 24px 48px rgba(15, 23, 42, 0.08);
        padding: 32px;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: #fef3c7;
        color: #92400e;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 8px 12px;
      }
      h1 {
        margin: 14px 0 10px;
        font-size: clamp(28px, 6vw, 40px);
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #475569;
        font-size: 16px;
        line-height: 1.7;
      }
      .hint {
        margin-top: 18px;
        font-size: 14px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <main class="panel">
      <div class="badge">Maintenance</div>
      <h1>We're temporarily unavailable</h1>
      <p>We're currently performing scheduled updates to improve the experience.</p>
      <p class="hint">Please try again in a few minutes.</p>
    </main>
  </body>
</html>`;
}

function maintenanceHeaders() {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "retry-after": String(getMaintenanceRetryAfterSeconds()),
  };
}

export async function GET() {
  return new Response(renderMaintenanceHtml(), {
    status: 503,
    headers: maintenanceHeaders(),
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 503,
    headers: maintenanceHeaders(),
  });
}

