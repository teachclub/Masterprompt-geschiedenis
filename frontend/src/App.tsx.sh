cat > /workspaces/Masterprompt-geschiedenis/frontend/src/App.tsx <<'EOF'
import React, { useEffect, useState } from 'react';
import { getInleiding, getTijdvakken, postSuggest, postGenerate } from './api';
import './index.css';

const DIMENSIES = [
  { key: 'econ', label: 'Economisch' },
  { key: 'soc', label: 'Sociaal-cultureel' },
  { key: 'pol', label: 'Politiek' },
  { key: 'emo', label: 'Emotioneel/Propaganda' },
  { key: 'ide', label: 'Ideologisch' }
];

export default function App(): JSX.Element {
  const [inleiding, setInleiding] = useState<string>('');
  const [tijdvakken, setTijdvakken] = useState<string[]>([]);
  const [type, setType] = useState<'KA' | 'TV'>('KA');
  const [tijdvak, setTijdvak] = useState<string>('');
  const [hoofdvraag, setHoofdvraag] = useState<string>('presentistisch');
  const [dims, setDims] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voorstellen, setVoorstellen] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [lesResult, setLesResult] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const i = await getInleiding();
        setInleiding((i as any).tekst || String(i));
        const tv = await getTijdvakken();
        setTijdvakken(tv || []);
        if (tv && tv.length) setTijdvak(tv[0]);
      } catch (e: any) {
        setError(e?.message || String(e));
      }
    })();
  }, []);

  const toggleDim = (key: string) => {
    setDims(prev => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]));
  };

  const handleSuggest = async () => {
    setError(null);
    setLoading(true);
    setVoorstellen([]);
    setSelected(null);
    try {
      const data = await postSuggest({ type, tijdvak, hoofdvraag: hoofdvraag || 'presentistisch', dimensies: dims });
      setVoorstellen(data || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selected) return setError('Selecteer eerst een voorstel.');
    setError(null);
    setGenerating(true);
    setLesResult('');
    try {
      const data = await postGenerate({ voorstel: selected, meta: { type, tijdvak, hoofdvraag, dimensies: dims } });
      setLesResult((data as any).markdown || '');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(lesResult);
    } catch {
      setError('Kopiëren mislukt (permissions).');
    }
  };

  return (
    <div className="container">
      <h1>Les-generator (mock ready)</h1>
      {inleiding && <p className="muted">{inleiding}</p>}

      <div className="form-grid">
        <label>
          Type
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="KA">KA</option>
            <option value="TV">TV</option>
          </select>
        </label>

        <label>
          Tijdvak
          <select value={tijdvak} onChange={e => setTijdvak(e.target.value)}>
            {tijdvakken.map(tv => (
              <option key={tv} value={tv}>
                {tv}
              </option>
            ))}
          </select>
        </label>

        <label>
          Hoofdvraag
          <input value={hoofdvraag} onChange={e => setHoofdvraag(e.target.value)} placeholder="presentistisch" />
        </label>

        <fieldset className="fieldset">
          <legend>Dimensies</legend>
          {DIMENSIES.map(d => (
            <label key={d.key} className="checkbox">
              <input type="checkbox" checked={dims.includes(d.key)} onChange={() => toggleDim(d.key)} /> {d.label}
            </label>
          ))}
        </fieldset>

        <div>
          <button onClick={handleSuggest} disabled={loading}>
            {loading ? 'Genereren...' : 'Genereer 5 voorstellen'}
          </button>
        </div>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {voorstellen.length > 0 && (
        <section>
          <h3>Voorstellen</h3>
          <ul className="voorstellen">
            {voorstellen.map((p: any) => (
              <li key={p.id || p.titel}>
                <label>
                  <input type="radio" name="voorstel" onChange={() => setSelected(p)} checked={selected?.id === p.id} /> {p.titel || p.summary || p}
                </label>
              </li>
            ))}
          </ul>
          <button onClick={handleGenerate} disabled={!selected || generating}>
            {generating ? 'Genereer les...' : 'Genereer les'}
          </button>
        </section>
      )}

      {lesResult && (
        <section>
          <h3>Gegenereerde les (Markdown)</h3>
          <div className="markdown-box">
            <button className="copy" onClick={copyToClipboard}>
              Kopieer
            </button>
            <pre>{lesResult}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
EOF