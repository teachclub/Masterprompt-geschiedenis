export async function hydrateCatalog() {
  try {
    const tvSel = document.querySelector('#tijdvak');
    const kaSel = document.querySelector('#ka');
    if (!tvSel && !kaSel) return;

    const [catalog, causes] = await Promise.all([
      fetch('/api/catalog').then(r=>r.json()),
      fetch('/api/causes').then(r=>r.json()).catch(()=>({causes:[]}))
    ]);

    if (tvSel && catalog.tijdvakken) {
      tvSel.innerHTML = '';
      for (const tv of catalog.tijdvakken) {
        const opt = document.createElement('option');
        opt.value = tv.id; opt.textContent = `${tv.id} — ${tv.label}`;
        tvSel.appendChild(opt);
      }
    }
    if (kaSel && catalog.kenmerkende_aspecten) {
      kaSel.innerHTML = '';
      for (const ka of catalog.kenmerkende_aspecten) {
        const opt = document.createElement('option');
        opt.value = ka.id; opt.textContent = `KA ${ka.id} — ${ka.label}`;
        kaSel.appendChild(opt);
      }
    }

    // Toon een hint met oorzaken als er een plek is
    const hintHost = document.querySelector('#oorzaken-hint');
    if (hintHost && causes.causes?.length) {
      hintHost.innerHTML = `<details style="margin:.5rem 0;"><summary>Keuzelijst oorzaken (optioneel)</summary><ul style="margin:.5rem 1rem;">
        ${causes.causes.map(c=>`<li>${c}</li>`).join('')}
      </ul></details>`;
    }
  } catch (e) {
    console.warn('Catalog hydrate failed:', e);
  }
}
