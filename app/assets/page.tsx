'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './assets.module.css';

type Asset = { id: string; kind: string; name: string; provider?: string; externalRef?: string; createdAt: string };
const KINDS = ['server', 'domain', 'service', 'api', 'database', 'other'];
const kindColor = (k: string): 'teal' | 'amber' | 'muted' => k === 'server' || k === 'database' ? 'teal' : k === 'api' || k === 'service' ? 'amber' : 'muted';
const kindIcon: Record<string, string> = { server: '🖥', domain: '🌐', service: '⚙', api: '⚡', database: '🗄', other: '📦' };

export default function AssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filterKind, setFilterKind] = useState<string>('all');

  const [aKind, setAKind] = useState('server');
  const [aName, setAName] = useState('');
  const [aProvider, setAProvider] = useState('');
  const [aRef, setARef] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('vault_token')) { router.push('/login'); return; }
    apiGet('/api/assets').then(setAssets).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  async function createAsset(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaveErr('');
    try {
      const a = await apiPost('/api/assets', { kind: aKind, name: aName, provider: aProvider || undefined, externalRef: aRef || undefined });
      setAssets(prev => [a, ...prev]);
      setShowCreate(false); setAName(''); setAProvider(''); setARef('');
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  }

  const filtered = filterKind === 'all' ? assets : assets.filter(a => a.kind === filterKind);
  const counts = KINDS.reduce((acc, k) => ({ ...acc, [k]: assets.filter(a => a.kind === k).length }), {} as Record<string, number>);

  return (
    <AppShell nav="assets" topAction={<Button variant="primary" onClick={() => setShowCreate(true)}>New Asset</Button>}>
      <div className={styles.page}>
        {/* Filter bar */}
        <div className={styles.filterBar}>
          <button className={`${styles.filter} ${filterKind === 'all' ? styles.filterActive : ''}`} onClick={() => setFilterKind('all')}>
            All <span className={styles.filterCount}>{assets.length}</span>
          </button>
          {KINDS.map(k => counts[k] > 0 && (
            <button key={k} className={`${styles.filter} ${filterKind === k ? styles.filterActive : ''}`} onClick={() => setFilterKind(k)}>
              {kindIcon[k]} {k} <span className={styles.filterCount}>{counts[k]}</span>
            </button>
          ))}
        </div>

        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-3)' }}>No assets yet</span>
          </div>
        )}

        <div className={styles.grid}>
          {filtered.map(a => (
            <div key={a.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}>{kindIcon[a.kind] ?? '📦'}</span>
                <Badge color={kindColor(a.kind)}>{a.kind}</Badge>
              </div>
              <div className={styles.cardName}>{a.name}</div>
              {a.provider && <div className={styles.cardProvider}>{a.provider}</div>}
              {a.externalRef && (
                <a href={a.externalRef.startsWith('http') ? a.externalRef : `https://${a.externalRef}`}
                  target="_blank" rel="noreferrer" className={styles.cardRef}>{a.externalRef}</a>
              )}
              <div className={styles.cardDate}>{new Date(a.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <div className={styles.backdrop} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>New Asset</div>
            <form onSubmit={createAsset} className={styles.modalForm}>
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Kind</label>
                <select className={styles.kindSelect} value={aKind} onChange={e => setAKind(e.target.value)}>
                  {KINDS.map(k => <option key={k} value={k}>{kindIcon[k]} {k}</option>)}
                </select>
              </div>
              <Input label="Name" value={aName} onChange={e => setAName(e.target.value)} required />
              <Input label="Provider (optional)" value={aProvider} onChange={e => setAProvider(e.target.value)} placeholder="AWS, GCP, Cloudflare…" />
              <Input label="External Ref / URL (optional)" value={aRef} onChange={e => setARef(e.target.value)} placeholder="https://…" />
              {saveErr && <div className={styles.error}>{saveErr}</div>}
              <div className={styles.modalFooter}>
                <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" type="submit" loading={saving}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
