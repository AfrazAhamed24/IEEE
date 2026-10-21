# SKY SENTRY — Orbital Debris Defense Grid

Real-time monitoring dashboard for the SKY SENTRY hackathon demo. Plain HTML5, CSS3, and vanilla ES6+ JavaScript — no frameworks, no build step.

## Requirements

- A FastAPI backend running on `http://localhost:8000`
- A modern browser (Chrome, Firefox, Edge, Safari)

## Run

Serve the `frontend/` folder with any static server, or just open `index.html` directly:

```bash
# option 1 — python
cd frontend
python3 -m http.server 5500
# open http://localhost:5500

# option 2 — open the file directly
open frontend/index.html
```

The page polls the backend every 1000ms regardless of origin, so no CORS proxy is required as long as the FastAPI app allows the request.

## Endpoints consumed

| Method | Path          | When                         |
| ------ | ------------- | ---------------------------- |
| GET    | `/api/track`  | Every 1000ms                 |
| GET    | `/api/evade`  | Only while `status === "breach"` |

## UI

- **Header** — title bar with a live UTC clock.
- **Status panel** — animated radar sweep plus a color-coded badge:
  - `SAFE` — green pulse
  - `WARNING` — amber pulse
  - `BREACH` — red flash at 2 Hz with a full alert banner and the signed evasion token (click the token to copy it)
- **Telemetry panel** — debris count, closest debris id/distance/velocity, safety-box radius, and a proximity gauge.
- **Event log** — rolling, timestamped log of status transitions, fetch errors, and evasion dispatches.

## Error handling

- Unreachable backend → striped `OFFLINE — RETRYING...` banner and a `LINK LOST` footer indicator; polling continues.
- Every fetch and `res.json()` is wrapped in `try/catch`, so malformed payloads never crash the app.
- Non-2xx responses and unknown status values are treated as errors / `safe` respectively.

## Files

```
frontend/
├── index.html   markup + panel structure
├── styles.css   theme, animations, responsive layout
└── app.js       polling, rendering, logging, error handling
```
