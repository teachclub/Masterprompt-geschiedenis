const envBase = (import.meta as any).env?.VITE_API_BASE;
const useMock = (import.meta as any).env?.VITE_USE_MOCK === '1';
const BASE = envBase || window.location.origin;

async function handleRes(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || \`\${res.status} \${res.statusText}\`);
  }
  return res.json().catch(() => ({}));
}

export async function getInleiding() {
  if (useMock) {
    return { tekst: 'Inleiding (mock): Werkvorm en doel van de les.' };
  }
  return fetch(\`\${BASE}/inleiding\`).then(handleRes);
}

export async function getTijdvakken() {
  if (useMock) {
    return ['Prehistorie', 'Oudheid', 'Middeleeuwen', 'Vroegmoderne Tijd', 'Moderne Tijd'];
  }
  return fetch(\`\${BASE}/tijdvakken\`).then(handleRes);
}

export async function getKas() {
  if (useMock) {
    return { items: ['Bron A', 'Bron B', 'Bron C'] };
  }
  return fetch(\`\${BASE}/kas\`).then(handleRes);
}

export async function postSuggest(payload: any) {
  if (useMock) {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: \`p\${i + 1}\`,
      titel: \`Voorstel \${i + 1} voor \${payload.hoofdvraag}\`,
      summary: \`Korte omschrijving \${i + 1}\`
    }));
  }
  return fetch(\`\${BASE}/api/suggest\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(handleRes);
}

export async function postGenerate(payload: any) {
  if (useMock) {
    return {
      markdown: \`# Les: \${payload.voorstel?.titel}\n\n**Doel:** Leerdoel voorbeeld\n\n**Opzet:**\n\n- Intro (10 min)\n- Werkvorm (25 min)\n\n**Bronnen:**\n\n- Voorbeeldbron A\`
    };
  }
  return fetch(\`\${BASE}/api/generate\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(handleRes);
}
