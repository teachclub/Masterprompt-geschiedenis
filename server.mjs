// server.mjs — ONE FILE TO RUN THEM ALL
// Run: node server.mjs
// Env vars: GCP_PROJECT_ID, GEMINI_VERTEX_LOCATION=europe-west1,
// GEMINI_MODEL_SUGGEST=gemini-1.5-flash, GEMINI_MODEL_GENERATE=gemini-1.5-pro,
// ALLOWED_ORIGIN=https://prompt-to-lesson-ck1.web.app, RUNTIME_REGION=(optional)

import express from "express";
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
  project: GCP_PROJECT_ID,
  location: GEMINI_VERTEX_LOCATION
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers: JSON discipline & fence stripping
// ──────────────────────────────────────────────────────────────────────────────
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
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    project: GCP_PROJECT_ID || "unknown",
    provider: "Vertex AI",
    model_region: GEMINI_VERTEX_LOCATION,
    runtime_region: RUNTIME_REGION || "unknown"
  });
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

app.post("/api/suggest", async (req, res) => {
  try {
    const { tv, ka, context } = req.body || {};
    if (!tv && !ka) return res.status(400).json({ error: "Missing tv or ka" });
    const items = await generateSuggestions({ tv, ka, context });
    res.json({ items: items.slice(0, 3) });
  } catch (e) {
    console.error("suggest error:", e);
    res.status(500).json({ error: "Internal error while suggesting" });
  }
});

/**
 * POST /api/generate
 * NL-Uitleg:
 * 1) Valideer invoer: we verwachten een gekozen "kaart" met minstens title + head_question.
 * 2) Vraag het model om een ruwe les (Markdown, zonder fences) volgens de didactische eisen.
 * 3) Post-processen met enhanceMarkdown:
 *    - H1 garanderen
 *    - Anti-presentisme intro injecteren (Het Vreemde Verleden)
 *    - Keuzelijst oorzaken boven samenwerkings-/kwadrantsectie
 *    - Fences weghalen en opschonen voor Canvas
 * 4) Retourneer JSON { markdown } met de definitieve schone tekst.
 */
app.post("/api/generate", async (req, res) => {
  try {
    const { chosen_card, options } = req.body || {};
    if (!chosen_card?.title || !chosen_card?.head_question) {
      return res.status(400).json({ error: "Missing chosen_card.title or chosen_card.head_question" });
    }
    const raw = await generateLesson({ chosen_card, options });
    if (!raw || typeof raw !== "string") {
      return res.status(500).json({ error: "Model returned empty content" });
    }
    const markdown = enhanceMarkdown(raw, {
      headQuestion: chosen_card.head_question,
      tv: options?.tv,
      ka: options?.ka,
      theme: options?.theme
    });
    res.json({ markdown });
  } catch (e) {
    console.error("generate error:", e);
    res.status(500).json({ error: "Internal error while generating" });
  }
});

// Global error formatter
app.use((err, _req, res, _next) => {
  if (err?.message === "Origin not allowed") return res.status(403).json({ error: "CORS: origin not allowed" });
  res.status(500).json({ error: "Unexpected server error" });
});

// ──────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Masterprompt backend up on :${PORT}`);
  console.log(`Model region: ${GEMINI_VERTEX_LOCATION} | Runtime: ${RUNTIME_REGION || "unknown"}`);
});

