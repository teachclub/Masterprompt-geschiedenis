import React, { useEffect, useState } from 'react';
import { getInleiding, getTijdvakken, getKas, postSuggest, postGenerate } from './api';

const DIMENSIES = [
  { key: 'econ', label: 'Economisch' },
  { key: 'soc', label: 'Sociaal-cultureel' },
  { key: 'pol', label: 'Politiek' },
  { key: 'emo', label: 'Emotioneel/Propaganda' },
  { key: 'ide', label: 'Ideologisch' }
];

export default function App() {
  const [inleiding, setInleiding] = useState<string>('');
  const [tijdvakken, setTijdvakken] = useState<string[]>([]);
  const [type, setType] = useState<'KA'|'TV'>('KA');
  const [tijdvak, setTijdvak] = useState<string>('');
  const [hoofdvraag, setHoofdvraag] = useState<string>('presentistisch');
  const [dims, setDims] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string| null>(null);
  const [voorstellen, setVoorstellen] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [lesResult, setLesResult] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const i = await getInleiding();
        setInleiding(i.tekst || i);
        const tv = await getTijdvakken();
        setTijdvakken(tv || []);
        if (tv && tv.length) setTijdvak(tv[0]);
      } catch (e: any) {
        setError(e.message || String(e));
      }
    })();
  }, []);

  const toggleDim = (key: string) => {
    setDims(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };

  const handleSuggest = async () => {
    setError(null);
    setLoading(true);
    setVoorstellen([]);
    setSelected(null);
    try {
      const data = await postSuggest({ type, tijdvak, hoofdvraag: hoofdvraag || 'presentistisch', dimensies: dims });
      setVoorstellen(data);
    } catch (e: any) {
      setError(e.message || String(e));
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
      const data = await postGenerate({ voorstel: selected, meta: { type, tijdvak, hoofdvraag: hoofdvraag || 'presentistisch', dimensies: dims }});
      setLesResult(data.markdown || data.markdown_text || '');
    } catch (e: any) {
      setError(e.message || String(e));
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
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Les-generator (mock ready)</h1>
      {inleiding && <p>{inleiding}</p>}
      <div style={{ display: 'grid', gap: 12, maxWidth: 720 }}>
        <label>
          Type:
          <select value={type} onChange={e => setType(e.target.value as any)}>
            <option value="KA">KA</option>
            <option value="TV">TV</option>
          </select>
        </label>

        <label>
          Tijdvak:
          <select value={tijdvak} onChange={e => setTijdvak(e.target.value)}>
            {tijdvakken.map(tv => <option key={tv} value={tv}>{tv}</option>)}
          </select>
        </label>

        <label>
          Hoofdvraag:
          <input value={hoofdvraag} onChange={e => setHoofdvraag(e.target.value)} placeholder="presentistisch" />
        </label>

        <fieldset>
          <legend>Dimensies (multi-select)</legend>
          {DIMENSIES.map(d => (
            <label key={d.key} style={{ display: 'block' }}>
              <input type="checkbox" checked={dims.includes(d.key)} onChange={() => toggleDim(d.key)} />
              {' '}{d.label}
            </label>
          ))}
        </fieldset>

        <div>
          <button onClick={handleSuggest} disabled={loading}>
            {loading ? 'Genereren...' : 'Genereer 5 voorstellen'}
          </button>
        </div>

        {error && <div style={{ color: 'crimson' }}>Error: {error}</div>}

        {voorstellen.length > 0 && (
          <div>
            <h3>Voorstellen</h3>
            <ul>
              {voorstellen.map(p => (
                <li key={p.id || p.titel}>
                  <label>
                    <input type="radio" name="voorstel" onChange={() => setSelected(p)} checked={selected?.id === p.id} />
                    {' '}{p.titel || p.summary || p}
                  </label>
                </li>
              ))}
            </ul>
            <button onClick={handleGenerate} disabled={!selected || generating}>
              {generating ? 'Genereer les...' : 'Genereer les'}
            </button>
          </div>
        )}

        {lesResult && (
          <div>
            <h3>Gegenereerde les (Markdown)</h3>
            <div style={{ whiteSpace: 'pre-wrap', border: '1px solid #ddd', padding: 12, borderRadius: 6, background: '#fafafa' }}>
              <button onClick={copyToClipboard} style={{ float: 'right' }}>Kopieer</button>
              <pre style={{ marginTop: 28 }}>{lesResult}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
