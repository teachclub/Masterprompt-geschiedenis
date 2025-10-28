# PROJECT_RULES

## Doel
Automatisch lessen genereren met anti-presentisme → schone Markdown, Canvas-klaar.

## Stack & Regio’s
- Node/Express op Cloud Run (**europe-west4**)
- Vertex AI (**europe-west1**)
- Modellen: `gemini-1.5-flash` (suggesties), `gemini-1.5-pro` (volledige les)

## API (contract)
- `GET /health` → `{ status, project, provider:"Vertex AI", model_region, runtime_region, uptime_sec, pid }`
- `GET /api/tijdvakken` → `[{ tv, ka:[...] }, ...]` (compacte SLO-subset)
- `POST /api/suggest` (min. `tv` of `ka`) → `{ items:[{ title, head_question, context, learning_summary }] }` (exact 3)
- `POST /api/generate` → `{ markdown: string }`

## Didactiek (hard rules)
- Bovenaan: “Het Vreemde Verleden – kijk met de bril van toen” (korte anti-presentisme-intro).
- **Docentversie:** WAT–HOE–WAAROM; 4–5 leerdoelen; **Antwoordmodel** (≥3 sleutelvragen) — antwoorden herhalen de vraag.
- **Leerlingversie:** startopdracht (anti-presentisme); **Keuzelijst Oorzaken** (standaard, maar overschrijfbaar per les);
  samenwerkingstabel (actor, kerngevoel, dimensie, 2 oorzaken, citaat ≤15w); **2×2-kwadrant** (themapassende labels);
  reflectie (≥2, ±100w, met bronverwijzing).
- **Bronnen:** 8 bronblokken (75–100 w) met 3 analysevragen; antwoorden herhalen de vraag.
- **Output:** 1 coherent Markdown-document; **geen code fences**.

## Enhancer (must)
- Inject: H1, anti-presentisme-intro, oorzakenlijst (of `options.causes`), strip fences, opschonen (tidy).

## Kwaliteit/Robuustheid
- Strikte CORS (exact **1** origin), `Content-Type` guard (`415`), input-validatie (`400`), timeouts (`504`), nette `500`.
- Request-size limit; geen prompts/keys loggen.

## Env-variabelen (voorbeeld)
GCP_PROJECT_ID=prompt-to-lesson-ck1
GEMINI_VERTEX_LOCATION=europe-west1
GEMINI_MODEL_SUGGEST=gemini-1.5-flash
GEMINI_MODEL_GENERATE=gemini-1.5-pro
ALLOWED_ORIGIN=https://prompt-to-lesson-ck1.web.app
RUNTIME_REGION=europe-west4
MODEL_TIMEOUT_MS=60000

## Git & Aider
Kleine commits met duidelijke messages; gebruik `aider server.mjs`, `/diff`, `/commit`, `/undo`.
