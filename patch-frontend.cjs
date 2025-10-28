const fs = require('fs');
const path = require('path');

const idxPath = path.join('public','index.html');
const appPath = path.join('public','app.js');
const catPath = path.join('public','app.catalog.js');

if (!fs.existsSync(catPath)) {
  fs.writeFileSync(catPath, `
export async function hydrateCatalog() {
  try {
    const tvSel = document.querySelector('#tijdvak');
    const kaSel = document.querySelector('#ka');

    const [catalog, causes] = await Promise.all([
      fetch('/api/catalog').then(r=>r.json()),
      fetch('/api/causes').then(r=>r.json()).catch(()=>({causes:[]})),
    ]);

    if (tvSel && catalog.tijdvakken) {
      tvSel.innerHTML = '';
      for (const tv of catalog.tijdvakken) {
        const opt = document.createElement('option');
        opt.value = tv.id; opt.textContent = \`\${tv.id} — \${tv.label}\`;
        tvSel.appendChild(opt);
      }
    }
    if (kaSel && catalog.kenmerkende_aspecten) {
      kaSel.innerHTML = '';
      for (const ka of catalog.kenmerkende_aspecten) {
        const opt = document.createElement('option');
        opt.value = ka.id; opt.textContent = \`KA \${ka.id} — \${ka.label}\`;
        kaSel.appendChild(opt);
      }
    }

    const hintHost = document.querySelector('#oorzaken-hint');
    if (hintHost && Array.isArray(causes.causes) && causes.causes.length) {
      hintHost.innerHTML = \`<details style="margin:.5rem 0;">
  <summary>Keuzelijst oorzaken (optioneel)</summary>
  <ul style="margin:.5rem 1rem;">\${causes.causes.map(c=>\`<li>\${c}</li>\`).join('')}</ul>
</details>\`;
    }
  } catch(e) {
    console.warn('Catalog hydrate failed:', e);
  }
}
`.trimStart(), 'utf8');
}

if (fs.existsSync(idxPath)) {
  let html = fs.readFileSync(idxPath,'utf8');
  html = html.replace(
    /<script([^>]*?)src=["']app\.js["'](.*?)>/i,
    (m, pre, post) => /type\s*=\s*["']module["']/.test(m) ? m : `<script${pre}src="app.js" type="module"${post}>`
  );
  if (!/id=["']oorzaken-hint["']/.test(html)) {
    html = html.replace(/<\/select>/i, `</select>\n<div id="oorzaken-hint" style="font-size:.95rem;color:#333;"></div>`);
  }
  fs.writeFileSync(idxPath, html, 'utf8');
}

if (fs.existsSync(appPath)) {
  let js = fs.readFileSync(appPath,'utf8');
  if (!/hydrateCatalog/.test(js)) {
    const head = `import { hydrateCatalog } from "./app.catalog.js";
window.addEventListener("DOMContentLoaded", hydrateCatalog);

`;
    js = head + js;
    fs.writeFileSync(appPath, js, 'utf8');
  }
} else {
  fs.writeFileSync(appPath, `import { hydrateCatalog } from "./app.catalog.js";
window.addEventListener("DOMContentLoaded", hydrateCatalog);
// (rest van je app-code hier)
`, 'utf8');
}

console.log('✅ Frontend gepatcht (CJS).');
