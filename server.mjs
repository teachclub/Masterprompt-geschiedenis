// server.mjs — ONE FILE TO RUN THEM ALL
// Run: node server.mjs
// Env vars: GCP_PROJECT_ID, GEMINI_VERTEX_LOCATION=europe-west1,
// GEMINI_MODEL_SUGGEST=gemini-1.5-flash, GEMINI_MODEL_GENERATE=gemini-1.5-pro,
// ALLOWED_ORIGIN=https://prompt-to-lesson-ck1.web.app, RUNTIME_REGION=(optional)

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { VertexAI } from "@google-cloud/vertexai";

// ──────────────────────────────────────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────────────────────────────────────
const {
  PORT = 8080,
  GCP_PROJECT_ID,
  GEMINI_VERTEX_LOCATION = "europe-west1", // EU-regio voor Vertex (model)
  GEMINI_MODEL_SUGGEST = "gemini-1.5-flash",
  GEMINI_MODEL_GENERATE = "gemini-1.5-pro",
  ALLOWED_ORIGIN = "https://prompt-to-lesson-ck1.web.app",
  RUNTIME_REGION = process.env.K_SERVICE ? process.env.X_GOOGLE_RUNTIME_REGION || process.env.REGION || process.env.GOOGLE_CLOUD_REGION : process.env.RUNTIME_REGION
} = process.env;

/** Masterprompt inladen */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MASTERPROMPT_PATH = path.join(__dirname, "prompts", "masterprompt_v3_3.md");

let MASTERPROMPT_TEXT = "";
try {
  MASTERPROMPT_TEXT = fs.readFileSync(MASTERPROMPT_PATH, "utf8");
  console.log(`Loaded masterprompt (${MASTERPROMPT_TEXT.length} chars) from ${MASTERPROMPT_PATH}`);
} catch (e) {
  console.warn("Masterprompt file not found:", MASTERPROMPT_PATH, e?.message || e);
}

const app = express();

// ──────────────────────────────────────────────────────────────────────────────
/** Strict CORS: alléén jouw UI-origin (en tools zonder Origin-header) */
app.use(cors({
  origin: (origin, cb) => (!origin || origin === ALLOWED_ORIGIN) ? cb(null, true) : cb(new Error("Origin not allowed")),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

/** Content-Type guard & strict JSON parsing */
app.use((req, res, next) => {
  if (req.method === "POST" && req.headers["content-type"] !== "application/json") {
    return res.status(415).json({ error: "Unsupported Media Type: use application/json" });
  }
  next();
});
app.use(express.json({ limit: "2mb" }));

// ──────────────────────────────────────────────────────────────────────────────
// Vertex AI client (EU)
// ──────────────────────────────────────────────────────────────────────────────
const vertex = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: GEMINI_VERTEX_LOCATION
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: JSON discipline & fence stripping
// ──────────────────────────────────────────────────────────────────────────────
function logModelError(e, tag = "model") {
  const msg   = e?.message || String(e);
  const name  = e?.name || "Error";
  const code  = e?.code ?? e?.status ?? e?.statusCode ?? null;
  const respS = e?.response?.status ?? e?.response?.statusCode ?? null;
  let respData = null;
  try { respData = e?.response?.data ? JSON.stringify(e.response.data).slice(0, 800) : null; } catch(_) {}
  console.error(`[${tag}] name=${name} code=${code} respStatus=${respS} msg=${msg}`);
  if (respData) console.error(`[${tag}] response:`, respData);
  if (e?.stack) console.error(`[${tag}] stack:\n${e.stack}`);
}

function stripFencesToJson(text) {
  return text.replace(/```(?:json|markdown|md)?\s*|\s*```/g, "").trim();
}
function stripMdFences(md) {
  return md.replace(/```(?:markdown|json|md)?\s*([\s\S]*?)\s*```/g, (_m, g1) => g1).trim();
}
/** Haal tekst uit Vertex-respons: probeer .text() / .text / diepe path fallback */
function takeTextFromResp(resp) {
  if (typeof resp?.response?.text === "string") return resp.response.text;
  if (typeof resp?.text === "string") return resp.text;
  const t = resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return typeof t === "string" ? t : "";
}

// ──────────────────────────────────────────────────────────────────────────────
// Markdown enhancer (anti-presentisme, structuur, oorzaken, schoonmaak)
// ──────────────────────────────────────────────────────────────────────────────
const DEFAULT_CAUSES = [
  { cat: "Politiek/bestuur", items: ["centralisatie", "legitimiteit (droit divin)", "orde & veiligheid"] },
  { cat: "Economisch/fiscaal", items: ["oorlogskosten", "belastingdruk", "handel/mercantilisme"] },
  { cat: "Ideologisch/religieus", items: ["eenheid van geloof", "gehoorzaamheid", "ketterijbestrijding"] },
  { cat: "Pragmatisch/orde", items: ["einde aan chaos/burgeroorlog", "efficiëntie", "hofdiscipline"] },
  { cat: "Emotioneel/veiligheid", items: ["angst/trauma", "groepsdruk", "eer/loyaliteit"] },
  { cat: "Extern", items: ["buitenlandse dreiging", "bondgenootschappen", "handelsoorlogen", "migratie"] }
];

function buildIntro({ tv, ka, theme }) {
  const scope = [theme, tv && `Tijdvak ${tv}`, ka && `KA ${ka}`].filter(Boolean).join(" · ");
  return [
    "> ### Het Vreemde Verleden — kijk met de bril van toen",
    "> In deze les onderzoeken we **waarom** mensen in hun **eigen tijd** keuzes maakten die wij nu vreemd of fout kunnen vinden.",
    "> Gebruik alleen informatie die **toen** beschikbaar was, met hun waarden, belangen en risico’s.",
    `> *Focus:* ${scope || "historische context van het onderwerp"}`,
    ""
  ].join("\n");
}

function buildCausesList(causes = DEFAULT_CAUSES) {
  const lines = [
    "### Keuzelijst: mogelijke oorzaken (kies wat past bij je uitleg)",
    "_Gebruik deze lijst om per bron → oorzaak expliciet te maken. Je mag combineren, maar wees concreet._",
    ""
  ];
  for (const c of causes) lines.push(`- **${c.cat}:** ${c.items.join(", ")}`);
  lines.push("");
  return lines.join("\n");
}

function ensureH1(md, { headQuestion, tv, ka }) {
  if (/^#\s/m.test(md)) return md;
  const h1 = `# Lesdocument — ${headQuestion || ""} ${tv ? `(Tijdvak ${tv})` : ""} ${ka ? `(KA ${ka})` : ""}`.trim();
  return `${h1}\n\n${md}`;
}

function injectCauses(md, causesBlock) {
  const pats = [
    /(^|\n)##\s*(Samenwerkingstabel|Positioneer(?:t|)abel|Positioneerkwadrant)[^\n]*\n/iu,
    /(^|\n)###\s*(Samenwerkingstabel|Positioneer(?:t|)abel|Positioneerkwadrant)[^\n]*\n/iu
  ];
  for (const pat of pats) if (pat.test(md)) return md.replace(pat, (m) => `${causesBlock}\n${m}`);
  return md.replace(/(^|\n)##\s*Leerlingversie[^\n]*\n/iu, (m) => `${m}\n${causesBlock}`);
}

function enhanceMarkdown(md, ctx = {}) {
  let out = stripMdFences(md);
  out = ensureH1(out, ctx);
  if (!/Het Vreemde Verleden/i.test(out)) {
    out = `${buildIntro(ctx)}${out}`;
  }
  out = injectCauses(out, buildCausesList(ctx.causes || undefined));
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// ──────────────────────────────────────────────────────────────────────────────
/** Model prompts */
// ──────────────────────────────────────────────────────────────────────────────
async function generateSuggestions({ tv, ka, context }) {
  const model = vertex.getGenerativeModel({ model: GEMINI_MODEL_SUGGEST });
  const prompt = [
    "Geef EXACT 3 suggesties als strikte JSON array van objects:",
    "Fields: title, head_question, context, learning_summary",
    "head_question is presentistische leerlingenoordeel-vraag.",
    "GEEN extra tekst, GEEN code fences.",
    `tv:${tv ?? ""} ka:${ka ?? ""} context:${context ?? ""}`
  ].join("\n");
  const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
  const text = takeTextFromResp(resp) || "[]";
  return JSON.parse(stripFencesToJson(text));
}

async function generateLesson({ chosen_card, options }) {
  const model = vertex.getGenerativeModel({ model: GEMINI_MODEL_GENERATE });
  const p = [
    "# Vereisten lesdocument (1 schoon Markdown, géén fences)",
    "- H1 met les/tijdvak.",
    "- Docentversie: WAT–HOE–WAAROM; concrete leerdoelen; antwoordmodel (≥3 sleutelvragen; antwoorden herhalen de vraag).",
    "- Leerlingversie: startopdracht (anti-presentisme, géén uitleg over presentisme); 2×2-positioneerkwadrant (labels passend bij thema); reflectie (≥2 vragen; antwoorden herhalen de vraag).",
    "- Bronnen: 8 bronblokken (75–100 woorden), elk met 3 analysevragen; antwoorden herhalen de vraag.",
    "- Géén codefences.",
    "",
    `Titel: ${chosen_card.title}`,
    `Hoofdvraag (presentistisch): ${chosen_card.head_question}`,
    `Context: ${chosen_card.context ?? ""}`,
    `TV: ${options?.tv ?? ""} KA: ${options?.ka ?? ""} THEMA: ${options?.theme ?? ""}`
  ].join("\n");
  const resp = await model.generateContent({ contents: [{ role: "user", parts: [{ text: p }] }] });
  return takeTextFromResp(resp) ?? "";
}

// ──────────────────────────────────────────────────────────────────────────────
/** Routes */
// ──────────────────────────────────────────────────────────────────────────────
/** ====== Dropdown data (tijdvakken, KA's, oorzaken) ====== */
const TIJDVAKKEN = [
  { id: "TV1", naam: "Tijdvak 1 – Jagers en boeren (tot 3000 v.Chr.)" },
  { id: "TV2", naam: "Tijdvak 2 – Grieken en Romeinen (3000 v.Chr.–500 n.Chr.)" },
  { id: "TV3", naam: "Tijdvak 3 – Monniken en ridders (500–1000)" },
  { id: "TV4", naam: "Tijdvak 4 – Steden en staten (1000–1500)" },
  { id: "TV5", naam: "Tijdvak 5 – Ontdekkers en hervormers (1500–1600)" },
  { id: "TV6", naam: "Tijdvak 6 – Regenten en vorsten (1600–1700)" },
  { id: "TV7", naam: "Tijdvak 7 – Pruiken en revoluties (1700–1800)" },
  { id: "TV8", naam: "Tijdvak 8 – Burgers en stoommachines (1800–1900)" },
  { id: "TV9", naam: "Tijdvak 9 – Wereldoorlogen (1900–1950)" },
  { id: "TV10", naam: "Tijdvak 10 – Televisie en computer (1950–nu)" }
];

const KENMERKENDE_ASPECTEN = {
  TV1: [
    "De overgang van jagen en verzamelen naar landbouw en veeteelt",
    "Het ontstaan van de eerste nederzettingen"
  ],
  TV2: [
    "Het ontstaan van de eerste beschavingen",
    "De ontwikkeling van de democratie en republiek",
    "Het ontstaan en de verspreiding van het christendom",
    "De opkomst en ondergang van het Romeinse rijk"
  ],
  TV3: [
    "De verspreiding van het christendom en de macht van de kerk",
    "Het ontstaan van de islam en de islamitische expansie",
    "De ontwikkeling van het feodalisme"
  ],
  TV4: [
    "De opkomst van steden en burgerij",
    "De ontwikkeling van handel en verkeer",
    "Het ontstaan van de standenmaatschappij",
    "De kruistochten"
  ],
  TV5: [
    "Het begin van de Europese overzeese expansie",
    "Het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling",
    "De hernieuwde oriëntatie op het erfgoed van de klassieke Oudheid",
    "De protestantse reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had",
    "Het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat"
  ],
  TV6: [
    "Het streven van vorsten naar absolute macht",
    "De bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek",
    "Wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie",
    "De wetenschappelijke revolutie"
  ],
  TV7: [
    "Rationeel optimisme en 'verlicht denken' toegepast op godsdienst, politiek, economie en sociale verhoudingen",
    "Voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven",
    "Uitbouw van de Europese overheersing, plantagekoloniën en trans-Atlantische slavenhandel; opkomst abolitionisme",
    "De democratische revoluties in westerse landen en discussies over grondwetten, grondrechten en staatsburgerschap"
  ],
  TV8: [
    "De industriële revolutie en haar gevolgen voor de samenleving",
    "De opkomst van liberalisme, nationalisme en socialisme",
    "De opkomst van de burgerij en het ontstaan van een moderne klassenmaatschappij",
    "Democratisering en emancipatie van verschillende bevolkingsgroepen",
    "Imperialisme en kolonialisme"
  ],
  TV9: [
    "De Eerste Wereldoorlog als een breuk in de Europese beschaving",
    "Het interbellum als een periode van crises",
    "De opkomst van het fascisme en nazisme",
    "De Tweede Wereldoorlog en de Holocaust",
    "Het ontstaan van de Koude Oorlog"
  ],
  TV10: [
    "Dekolonisatie en het ontstaan van de derde wereld",
    "De Koude Oorlog en de bipolaire wereldorde",
    "Economische en politieke integratie van Europa",
    "Sociale en culturele veranderingen in westerse landen",
    "Het einde van de Koude Oorlog en de gevolgen daarvan voor de wereldorde"
  ]
};

/** Suggestie-lijst van oorzaken/motieven (keuzelijst voor leerlingen) */
const OORZAKEN_DEFAULT = [
  "Economisch motief (handel, winst, arbeidsmarkt)",
  "Sociaal-cultureel motief (status, traditie, opvoeding)",
  "Politiek-bestuurlijk motief (macht, orde, wetgeving)",
  "Emotioneel/propaganda (angst, hoop, beeldvorming)",
  "Ideologisch/wereldbeeld (religie, overtuiging, wetenschap)",
  "Extern/intern conflict (oorlog, rivaliteit, opstand)",
  "Toeval/contingentie (onvoorziene gebeurtenis, individu)"
];

/** ====== Healthcheck ====== */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    project: GCP_PROJECT_ID || "unknown",
    provider: "Vertex AI",
    model_region: GEMINI_VERTEX_LOCATION,
    runtime_region: RUNTIME_REGION || "unknown",
    uptime_sec: Math.floor(process.uptime())
  });
});

/** Inspectie van de masterprompt (markdown) */
app.get("/api/masterprompt", (_req, res) => {
  if (!MASTERPROMPT_TEXT) {
    return res.status(404).json({ error: "masterprompt not loaded", path: MASTERPROMPT_PATH });
  }
  res.type("text/markdown").send(MASTERPROMPT_TEXT);
});

/** Dropdown-opties voor frontend */
app.get("/api/options", (_req, res) => {
  res.json({
    tijdvakken: TIJDVAKKEN,
    kenmerkendeAspecten: KENMERKENDE_ASPECTEN
  });
});

/** Keuzelijst met oorzaken/motieven (voor boven de tabel) */
app.get("/api/causes", (_req, res) => {
  res.json({ oorzaken: OORZAKEN_DEFAULT });
});

/** Inleiding (±150 woorden) voor de app + korte instructie */
app.get("/api/inleiding", (_req, res) => {
  const tekst =
`Deze applicatie helpt je om snel een volledige, didactisch sterke geschiedenisles te bouwen in de geest van *Het Vreemde Verleden*. Je start met een **presentistische hoofdvraag in leerlingentaal**—een vraag die bewust "met de bril van nu" kijkt. Vervolgens kies je een **tijdvak** en een **kenmerkend aspect**. De app stelt **bronnen uit meerdere dimensies** (economisch, sociaal-cultureel, politiek, emotioneel/propaganda, ideologisch) voor. Leerlingen gebruiken die bronnen om te **contextualiseren** en leren zo **historisch redeneren**: begrijpen waarom keuzes toen logisch konden zijn—zonder dat "begrijpen" hetzelfde is als "goedkeuren". Dit zet aan tot nieuwsgierigheid en eindigt in een vruchtbare klassendiscussie rond de hoofdvraag.

**Kort gebruiksadvies**
1) Kies *Tijdvak* en *KA* in de dropdowns.
2) Formuleer een **presentistische hoofdvraag** in leerlingentaal.
3) Selecteer of bewerk de **oorzaken-keuzelijst** boven de tabel.
4) Genereer de les → je krijgt **docent-** en **leerlingversie** met bronnen, vragen en antwoordmodel.`;
  res.type("text/plain").send(tekst);
});

/* ──────────────────────────────────────────────────────────────────────────────
   MASTERPROMPT – Suggest & Generate endpoints (v3.1)
   Vereist env: GCP_PROJECT_ID, GEMINI_VERTEX_LOCATION,
               GEMINI_MODEL_SUGGEST, GEMINI_MODEL_GENERATE
   ────────────────────────────────────────────────────────────────────────────── */

async function ensureModels() {
  const { VertexAI } = await import("@google-cloud/vertexai");
  const project = process.env.GCP_PROJECT_ID || GCP_PROJECT_ID || "unknown";
  const location = process.env.GEMINI_VERTEX_LOCATION || GEMINI_VERTEX_LOCATION || "europe-west1";
  const modelSuggest = process.env.GEMINI_MODEL_SUGGEST || (typeof GEMINI_MODEL_SUGGEST !== "undefined" ? GEMINI_MODEL_SUGGEST : "gemini-1.5-flash");
  const modelGenerate = process.env.GEMINI_MODEL_GENERATE || (typeof GEMINI_MODEL_GENERATE !== "undefined" ? GEMINI_MODEL_GENERATE : "gemini-1.5-pro");

  if (!project || project === "unknown") {
    throw new Error("GCP project ontbreekt. Zet GCP_PROJECT_ID in .env en run gcloud auth application-default login");
  }

  const vertex = new VertexAI({ project, location });
  return {
    suggest: vertex.getGenerativeModel({ model: modelSuggest }),
    generate: vertex.getGenerativeModel({ model: modelGenerate }),
    meta: { project, location, modelSuggest, modelGenerate }
  };
}

function stripFences(s) {
  if (!s) return s;
  // verwijder ```...``` blokken en overbodige whitespace
  return s.replace(/```[a-zA-Z]*\s*([\s\S]*?)```/g, "$1").trim();
}

function buildSuggestPrompt({ ka, tijdvak, context, verplicht, extra }) {
  // v3.1 – fase 1: exact 5 voorstellen, JSON-output
  return `
Je bent een historisch didacticus. Lever fase 1 output voor MASTER-PROMPT v3.1.

Doelgroep: VO 3–5 havo/vwo.
Antipresentisme (Tim Huijgen): leerlingen onderzoeken keuzes in de context van toen.

INPUT
- KENMERKEND_ASPECT of TIJDVAK: ${ka || tijdvak || ""}
- CONTEXT (optioneel): ${context || "(geen)"}
- VERPLICHTE BRONNEN/COLLECTIES (optioneel): ${verplicht || "(geen)"}
- EXTRA WENSEN (optioneel): ${extra || "(geen)"}

TAKEN (fase 1):
Geef **exact 5 voorstellen**. Elk voorstel heeft:
- title
- mini_rationale (2–3 zinnen over anti-presentisme en didactische waarde)
- core_collections (2–4 echte, bestaande collecties/archieven)
- dimensions (mogelijk relevante dimensies/invalshoeken voor debat)
- reasoning_hook (kort, prikkelende invalshoek/vraag)

FORMAT:
Output **uitsluitend** als geldige JSON, zonder extra tekst of uitleg:

{
  "suggestions": [
    {
      "title": "...",
      "mini_rationale": "...",
      "core_collections": ["...", "..."],
      "dimensions": ["economisch", "sociaal-cultureel", "politiek", "ideologisch"],
      "reasoning_hook": "..."
    },
    ...
  ]
}

Regels:
- Geen presentistische oordelen.
- Alleen bestaande collecties noemen (bv. Stadsarchief Amsterdam, NIOD, Arolsen, British Library Newspapers, Nationaal Archief, USC Shoah Foundation).
- Variatie in invalshoek.
`.trim();
}

function buildGeneratePrompt({ keuze, ka, tijdvak, context, verplicht, extra }) {
  // v3.1 – fase 2: één complete les, Canvas-klare Markdown
  return `
Je bent een historisch didacticus. Lever fase 2 output voor MASTER-PROMPT v3.1.

LEERKRACHT-AANPAK
- Anti-presentisme (Tim Huijgen): leerlingen contextualiseren het verleden zelf.
- Doelgroep: VO 3–5 havo/vwo (leerlingteksten B1–B2; docent C1).
- Lesduur: 50 min (richtlijn).
- Echte, verifieerbare bronnen (primair waar mogelijk). Geen fictie.

INPUT
- Gekozen voorstel (titel): ${keuze || "(ontbreekt)"}
- KENMERKEND_ASPECT of TIJDVAK: ${ka || tijdvak || ""}
- CONTEXT (optioneel): ${context || "(geen)"}
- VERPLICHTE BRONNEN/COLLECTIES (optioneel): ${verplicht || "(geen)"}
- EXTRA WENSEN (optioneel): ${extra || "(geen)"}

HARDERE EISEN VOOR DE LES
- **Exacte structuur** en **puur Markdown** (geen code fences).
- H1-kop (les-titel).
- **Docentversie** met WAT–HOE–WAAROM; leerdoelen; **antwoordmodel** (min. 3 vragen; antwoorden herhalen de vraag).
- **Leerlingversie**: startopdracht (anti-presentisme, activeert "bril van toen"); **2×2-positioneerkwadrant** (labels expliciet en op dit thema toegesneden); **reflectie** (min. 2 vragen; antwoorden herhalen de vraag).
- **Bronnen**: **8 echte bronnen** (75–100 woorden per bron); bij elke bron **3 analysevragen**; **antwoorden herhalen de vraag**.
- **Fences strippen & schoon Markdown**: géén \`\`\`, géén overbodige preambles.
- Waar passend: meerderheid **primaire** bronnen (dagboek/brief/toespraak/krant; persoon aan het woord). Varieer in perspectief.

FORMAT – uitsluitend Canvas-klare Markdown, geen extra commentaar. 
`.trim();
}

async function callGeminiJSON(model, prompt) {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { responseMimeType: "application/json" }
  });
  const txt = result.response.text();
  try {
    return JSON.parse(txt);
  } catch {
    // poging: JSON eruit vissen
    const m = txt.match(/\{[\s\S]*\}$/);
    return m ? JSON.parse(m[0]) : { suggestions: [] };
  }
}

async function callGeminiText(model, prompt) {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }]}]
  });
  return result.response.text();
}

function ensureJsonArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "object" && Array.isArray(x.suggestions)) return x.suggestions;
  return [];
}

/* ─── POST /api/suggest ─────────────────────────────────────────────────────── */
app.post("/api/suggest", express.json(), async (req, res) => {
  const MASTERPROMPT = MASTERPROMPT_TEXT;
  try {
    const payload = {
      ka: req.body?.ka || null,
      tijdvak: req.body?.tijdvak || null,
      context: req.body?.context || null,
      verplicht: req.body?.verplichteBronnen || req.body?.verplicht || null,
      extra: req.body?.extra || null
    };
    if (!payload.ka && !payload.tijdvak) {
      return res.status(400).json({ error: "Geef {ka} OF {tijdvak} mee." });
    }

    const { suggest, meta } = await ensureModels();
    const prompt = buildSuggestPrompt(payload);
    const json = await callGeminiJSON(suggest, prompt);
    const suggestions = ensureJsonArray(json);

    return res.json({
      status: "ok",
      project: meta.project,
      model: meta.modelSuggest,
      count: suggestions.length,
      suggestions
    });
  } catch (err) {
    console.error("suggest error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

/* ─── POST /api/generate ────────────────────────────────────────────────────── */
app.post("/api/generate", express.json(), async (req, res) => {
  const MASTERPROMPT = MASTERPROMPT_TEXT;
  try {
    const payload = {
      keuze: req.body?.keuze || req.body?.title || null,
      ka: req.body?.ka || null,
      tijdvak: req.body?.tijdvak || null,
      context: req.body?.context || null,
      verplicht: req.body?.verplichteBronnen || req.body?.verplicht || null,
      extra: req.body?.extra || null
    };
    if (!payload.keuze) {
      return res.status(400).json({ error: "Ontbreekt: {keuze} (titel van gekozen voorstel)." });
    }

    const { generate, meta } = await ensureModels();
    const prompt = buildGeneratePrompt(payload);
    const raw = await callGeminiText(generate, prompt);

    // lichte opschoning
    let md = stripFences(raw);
    if (!/^#\s/m.test(md)) {
      // zorg dat er een H1 boven staat
      md = `# ${payload.keuze}\n\n` + md;
    }

    return res.json({
      status: "ok",
      project: meta.project,
      model: meta.modelGenerate,
      markdown: md
    });
  } catch (err) {
    console.error("generate error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
});

app.get("/api/tijdvakken", (_req, res) => {
  res.json({
    items: [
      { tv: 5, label: "Ontdekkers & Hervormers", ka: [20, 21, 22, 23, 24, 25] },
      { tv: 6, label: "Regenten & Vorsten", ka: [26, 27, 28, 29] },
      { tv: 7, label: "Pruiken & Revoluties", ka: [30, 31, 32] },
      { tv: 8, label: "Burgers & Stoommachines", ka: [33, 34, 35, 36] },
      { tv: 9, label: "Wereldoorlogen", ka: [37, 38, 39, 40] },
      { tv: 10, label: "Televisie & Computer", ka: [41, 42, 43, 44, 45] }
    ]
  });
});

// Diagnose endpoint met Vertex "ping" test
app.get("/diag", async (_req, res) => {
  try {
    // Minimale Vertex ping met suggest model
    const model = vertex.getGenerativeModel({ model: GEMINI_MODEL_SUGGEST });
    const resp = await model.generateContent({ 
      contents: [{ role: "user", parts: [{ text: "ping" }] }] 
    });
    
    // Succes: model werkt
    res.json({
      ok: true,
      model_region: GEMINI_VERTEX_LOCATION,
      runtime_region: RUNTIME_REGION || "unknown",
      ping_response: takeTextFromResp(resp)?.slice(0, 100) || "empty"
    });
  } catch (e) {
    // Zelfde uitgebreide logging als suggest
    const name = e?.name || "Error";
    const code = e?.code ?? e?.status ?? e?.statusCode ?? null;
    const respStatus = e?.response?.status ?? e?.response?.statusCode ?? null;
    const msg = e?.message || String(e);
    
    let respData = null;
    try {
      if (e?.response?.data) {
        respData = JSON.stringify(e.response.data).slice(0, 500);
      }
    } catch (_) {}
    
    console.error(`[diag] name=${name} code=${code} respStatus=${respStatus} msg=${msg}`);
    if (respData) console.error(`[diag] response:`, respData);
    if (e?.stack) console.error(`[diag] stack:\n${e.stack}`);
    
    res.status(500).json({
      error: "Vertex AI connection failed",
      hint: "Check GCP_PROJECT_ID, GEMINI_VERTEX_LOCATION, ADC credentials, and server logs"
    });
  }
});


// Global error formatter
app.use((err, _req, res, _next) => {
  if (err?.message === "Origin not allowed") return res.status(403).json({ error: "CORS: origin not allowed" });
  res.status(500).json({ error: "Unexpected server error" });
});
app.get('/diag', (_req, res) => {
  res.json({ ok: true, mode: "mock" });
});


// ──────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Masterprompt backend up on :${PORT}`);
  console.log(`Model region: ${GEMINI_VERTEX_LOCATION} | Runtime: ${RUNTIME_REGION || "unknown"}`);
});

