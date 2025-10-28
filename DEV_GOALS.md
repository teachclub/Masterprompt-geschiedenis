# DEV_GOALS

## MVP (vandaag)
1) `GET /health` met uptime & regio’s.
2) `POST /api/suggest` → exact 3 items + guards (`415/400/504`).
3) `POST /api/generate` + **enhanceMarkdown** (H1, intro, oorzaken, strip fences).
4) Rooktestscript: check 200’s en basisvormen.

## Korte termijn
- `GET /api/tijdvakken` (compacte SLO-subset).
- Input-schema’s voor tv/ka/context/causes.
- Automatische themalabels voor 2×2-kwadrant uit `options.theme`.
- Basic rate-limit & request-size limit.

## Deploy
- Staging op Cloud Run (**europe-west4**), rooktests, dan promote naar prod.
- CORS: alleen `ALLOWED_ORIGIN`.
- Logging: statuscodes & latency; geen PII/promptinhoud.

## Tests
- `scripts/rooktest.sh`: curl `/health`, `/api/suggest {tv:6}`, `/api/generate {...}`; asserts op vorm/velden.

## Operatie
- Model timeout 60s; retry bij 429/5xx met jitter.
- Duidelijke `{ error, hint }` payload bij fouten.
