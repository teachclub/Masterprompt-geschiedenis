
export async function getInleiding(): Promise<{ tekst: string }> {
  return { tekst: 'Welkom bij de les-generator (mock data).' };
}

export async function getTijdvakken(): Promise<string[]> {
  return ['Prehistorie', 'Oudheid', 'Middeleeuwen', 'Vroegmoderne tijd', 'Moderne tijd'];
}

export async function postSuggest(payload: any): Promise<any[]> {
  void payload; // voorkom TS6133: parameter wordt bewust niet gebruikt
  return [
    { id: '1', titel: 'Klassieke samenleving' },
    { id: '2', titel: 'Oorlog en vrede' },
    { id: '3', titel: 'Handel en economie' },
    { id: '4', titel: 'Cultuur en religie' },
    { id: '5', titel: 'Technologische veranderingen' }
  ];
}

export async function postGenerate(payload: any): Promise<{ markdown: string }> {
  const titel = payload?.voorstel?.titel || payload?.voorstel || 'Voorstel';
  return { markdown: `# Les: ${titel}\n\nDit is een mock lesinhoud.` };
}
