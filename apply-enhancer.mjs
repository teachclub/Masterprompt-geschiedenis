import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), "server.mjs");
if (!fs.existsSync(file)) {
  console.error("❌ Niet gevonden: server.mjs in", process.cwd());
  process.exit(1);
}
let src = fs.readFileSync(file, "utf8");
let changed = false;

const enhancerCode = `
function enhanceMarkdown(md){
  try{
    let out = String(md||"");
    // strip eventuele code fences
    out = out.replace(/^\\s*\\\`\\\`\\\`(?:markdown)?\\s*/i,"").replace(/\\s*\\\`\\\`\\\`\\s*$/i,"").trim();
    const intro = "\\n### Introductie: Het Vreemde Verleden\\nWe kijken vandaag bewust door de **bril van toen**. In plaats van direct te oordelen met onze normen,\\nvraag je: *wat leek mensen toen redelijk of noodzakelijk?* Zo voorkomen we presentisme.\\n";
    if (!/Het Vreemde Verleden/.test(out)) {
      out = out.replace(/(#\\s*Lesontwerp[^\\n]*\\n)/i, "$1" + intro + "\\n");
    }
    return out;
  }catch{ return md; }
}
`;

// 2a) Injecteer enhancer direct na import-blok
if (!src.includes("function enhanceMarkdown(")) {
  const lines = src.split("\n");
  let insertPos = 0;
  while (insertPos < lines.length && lines[insertPos].trim().startsWith("import ")) insertPos++;
  lines.splice(insertPos, 0, "", enhancerCode.trim(), "");
  src = lines.join("\n");
  changed = true;
}

// 2b) Hook vóór eerste res.end(JSON.stringify(obj));
if (!src.includes("obj.markdown = enhanceMarkdown(")) {
  const target = "res.end(JSON.stringify(obj));";
  const idx = src.indexOf(target);
  if (idx !== -1) {
    const patched = `try{ if (obj && typeof obj.markdown==='string'){ obj.markdown = enhanceMarkdown(obj.markdown); } }catch{}\\n  ${target}`;
    src = src.slice(0, idx) + patched + src.slice(idx + target.length);
    changed = true;
  } else {
    const target2 = "res.end(JSON.stringify(obj))";
    const idx2 = src.indexOf(target2);
    if (idx2 !== -1) {
      const patched2 = `try{ if (obj && typeof obj.markdown==='string'){ obj.markdown = enhanceMarkdown(obj.markdown); } }catch{}\\n  ${target2}`;
      src = src.slice(0, idx2) + patched2 + src.slice(idx2 + target2.length);
      changed = true;
    }
  }
}

// 2c) Voeg serveFile toe als die ontbreekt (ESM-veilig)
if (!src.includes("function serveFile(")) {
  const snippet = `
function serveFile(res, filePath, contentType="text/plain"){
  try{
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {"Content-Type": contentType});
    res.end(data);
  }catch(e){
    res.writeHead(404, {"Content-Type":"text/plain"});
    res.end("Not found");
  }
}
`.trim();
  const createIdx = src.indexOf("http.createServer(");
  if (createIdx !== -1) {
    src = src.slice(0, createIdx) + "\\n" + snippet + "\\n\\n" + src.slice(createIdx);
  } else {
    src += "\\n\\n" + snippet + "\\n";
  }
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, src, "utf8");
  console.log("✅ server.mjs gepatcht (enhancer + hook + serveFile).");
} else {
  console.log("ℹ️ Geen wijzigingen nodig (reeds aanwezig).");
}
