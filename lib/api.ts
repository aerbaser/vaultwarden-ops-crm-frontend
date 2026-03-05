const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiGet(path: string) {
  const csrf = typeof window !== 'undefined' ? sessionStorage.getItem('crm_csrf') ?? '' : '';
  const r = await fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'x-csrf-token': csrf } });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export async function apiPost(path: string, body: unknown) {
  const csrf = typeof window !== 'undefined' ? sessionStorage.getItem('crm_csrf') ?? '' : '';
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export async function vaultGet(path: string, vaultToken: string) {
  const r = await fetch(`${BASE}/api/vault${path}`, {
    credentials: 'include',
    headers: { 'authorization': `Bearer ${vaultToken}`, 'x-csrf-token': '' },
  });
  if (!r.ok) throw new Error(`${r.status} vault${path}`);
  return r.json();
}
