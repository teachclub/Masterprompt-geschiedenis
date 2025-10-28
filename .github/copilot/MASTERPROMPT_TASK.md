# Copilot Build Task — Masterprompt-geschiedenis

## Doel
Implementeer/verbeter een werkende les-generator (frontend + backend) o.b.v. **Masterprompt v3.3**.

## Wat moet er komen/blijven werken
1) **Frontend**
- Dropdowns voor **Kenmerkende Aspecten (KA)** en **Tijdvakken (TV)** (TV5–TV10 minimaal), vooraf ingevuld uit backend.
- Een **inleiding (±150 woorden)** bovenaan de pagina die kort uitlegt wat de app doet + korte instructie (3–5 bullets).
- **Hoofdvraag in leerlingentaal** met bewust **presentisme** (“bril van nu”) — door bronnenonderzoek verschuift dit naar “bril van toen”.
- **Selecteerbare oorzaken/dimensies** als **keuzelijst** boven de bronnentabel (bijv. economisch, sociaal-cultureel, politiek, emotioneel/propaganda, ideologisch); leerling kan per bron aanvinken/kiezen.
- UI knoppen: **Genereer 5 voorstellen** → **Kies voorstel** → **Genereer volledige les** (Docent + Leerling).
- Toon voortgang/status en duidelijke foutmeldingen.

2) **Backend (Node server.mjs)**
- Endpoints (reeds deels aanwezig, verbeteren waar nodig):
  - `GET /inleiding` → geeft de 150-woorden uitleg + korte instructie terug (strings).
  - `GET /tijdvakken` en `GET /kas` → opties voor dropdowns (JSON).
  - `POST /api/suggest` → 5 lesvoorstellen (JSON), **Masterprompt v3.3** gebruiken.
  - `POST /api/generate` → 1 Canvas-klare Markdown (Docent + Leerling, bronnen ±70–120 w, 8 echte bronnenvelden toegestaan als placeholder).
  - `GET /health` → `{status:"ok", uptime_sec, ...}`.
  - `GET /diag` → als `USE_MOCK=1` **mock** JSON, anders echte Vertex-probe; nooit laten crashen.
- Respecteer CORS (`ALLOWED_ORIGIN`).

3) **Didactische eisen (samengevat uit Masterprompt v3.3)**
- **Het Vreemde Verleden**: leerlingen starten met presentistische **hoofdvraag**; via bronnen en dimensies **contextualiseren** ze naar “bril van toen”.
- Docentversie: **WAT–HOE–WAAROM**, leerdoelen, **antwoordmodel** (minimaal 3 vragen, antwoorden herhalen de vraag).
- Leerlingversie: **startopdracht (anti-presentisme)**, **2×2-positioneerkwadrant** (labels expliciet), **reflectie** (≥2 vragen, antwoorden herhalen de vraag).
- **Bronnen**: 8 bronnen met elk 70–120 woorden + 3 analysevragen; **geen presentisme-uitleg in leerlingenteksten**.
- **Keuzelijst oorzaken/dimensies** boven de bronnentabel (selecteerbaar).
- Schoon **Markdown** (geen ``` fences in eindoutput).

## Techniek
- Backend: `server.mjs` (Node/Express), Vertex AI via env: `GCP_PROJECT_ID`, `GEMINI_VERTEX_LOCATION`, modellen: `GEMINI_MODEL_SUGGEST`, `GEMINI_MODEL_GENERATE`.
- Mock modus: `USE_MOCK=1` moet alle endpoints laten reageren met plausibele data (geen crashes zonder GCP).
- Frontend (indien nog niet aanwezig): lichte Vite/React setup, fetch naar bovenstaande endpoints, nette UX.

## Acceptatiecriteria
- Dropdowns gevuld via backend-endpoints; selectie beïnvloedt prompts.
- `/inleiding` retourneert ±150 woorden + 3–5 bullets instructie en wordt zichtbaar in de UI.
- **Suggest → Choose → Generate** flow werkt; eindresultaat is één **Canvas-klare** Markdown.
- Keuzelijst **oorzaken/dimensies** is klikbaar en wordt meegenomen in `suggest`/`generate`.
- `USE_MOCK=1` levert bruikbare demodata zodat alles lokaal werkt zonder GCP.

## Waar staat de prompt
- Volledige Masterprompt: `prompts/masterprompt_v3_3.md`
