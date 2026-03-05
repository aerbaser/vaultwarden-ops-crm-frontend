'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, vaultGet } from '@/lib/api';
import { useAuth, useVault } from '@/lib/store';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './vault.module.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function cipherTypeDot(type: number) {
  if (type === 1) return styles.dotTeal;
  if (type === 3) return styles.dotAmber;
  return styles.dotMuted;
}

function cipherTypeLabel(type: number) {
  if (type === 1) return 'login';
  if (type === 2) return 'note';
  if (type === 3) return 'card';
  if (type === 4) return 'identity';
  return 'item';
}

export default function VaultPage() {
  const router = useRouter();
  const { email, vaultToken, lock } = useAuth();
  const { projects, ciphers, selectedProject, selectedFolder, setProjects, setCiphers, select } = useVault();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string>('');
  const [shareModal, setShareModal] = useState(false);
  const [shareTtl, setShareTtl] = useState('24');
  const [shareViews, setShareViews] = useState('3');
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  useEffect(() => {
    const token = vaultToken || (typeof window !== 'undefined' ? sessionStorage.getItem('vault_token') ?? '' : '');
    if (!token) { router.push('/login'); return; }
    Promise.all([
      apiGet('/api/projects').catch(() => []),
      vaultGet('/sync', token).catch(() => ({ Ciphers: [] })),
    ]).then(([proj, sync]) => {
      setProjects(proj ?? []);
      setCiphers(sync?.Ciphers ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  async function doShare() {
    if (!selected) return;
    setShareLoading(true); setShareError(''); setShareUrl('');
    try {
      const res = await apiPost('/api/share/from-vault', {
        itemName: selected.Name,
        ttlHours: Number(shareTtl),
        maxViews: Number(shareViews),
      });
      setShareUrl(res.url ?? '');
    } catch (e: any) {
      setShareError(e.message ?? 'Share failed');
    } finally { setShareLoading(false); }
  }

  const filteredCiphers = ciphers.filter(c => {
    if (selectedProject) return c.FolderId === selectedProject;
    return true;
  });

  const nav = [
    { label: 'Vault', href: '/vault', active: true },
    { label: 'Operations', href: '/operations' },
    { label: 'Audit', href: '/audit' },
  ];

  return (
    <div className={styles.root}>
      {/* Top bar */}
      <header className={styles.topbar}>
        <div className={styles.brand}>🔐 <span>VAULT OPS</span></div>
        <nav className={styles.nav}>
          {nav.map(n => (
            <a key={n.href} href={n.href} className={`${styles.navLink} ${n.active ? styles.navActive : ''}`}>{n.label}</a>
          ))}
        </nav>
        <div className={styles.topRight}>
          <span className={styles.emailLabel}>{email}</span>
          <Button variant="ghost" onClick={() => { lock(); router.push('/login'); }}>Lock</Button>
        </div>
      </header>

      <div className={styles.workspace}>
        {/* Left sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>Projects</div>
            <button
              className={`${styles.sideItem} ${!selectedProject ? styles.sideItemActive : ''}`}
              onClick={() => select(null, null)}
            >
              All items
            </button>
            {projects.map((p: any) => (
              <button
                key={p.id}
                className={`${styles.sideItem} ${selectedProject === p.id ? styles.sideItemActive : ''}`}
                onClick={() => select(p.id, null)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Cipher list */}
        <main className={styles.listPanel}>
          {loading ? (
            <div className={styles.emptyState}>Loading vault…</div>
          ) : filteredCiphers.length === 0 ? (
            <div className={styles.emptyState}>No items</div>
          ) : (
            filteredCiphers.map((c: any) => (
              <button
                key={c.Id}
                className={`${styles.cipherRow} ${selected?.Id === c.Id ? styles.cipherRowActive : ''}`}
                onClick={() => { setSelected(c); setRevealed(false); }}
              >
                <span className={`${styles.typeDot} ${cipherTypeDot(c.Type)}`}/>
                <div className={styles.cipherInfo}>
                  <span className={styles.cipherName}>{c.Name}</span>
                  <span className={styles.cipherSub}>{c.Login?.Username ?? cipherTypeLabel(c.Type)}</span>
                </div>
                <Badge color={c.Type === 1 ? 'teal' : c.Type === 3 ? 'amber' : 'muted'}>{cipherTypeLabel(c.Type)}</Badge>
              </button>
            ))
          )}
        </main>

        {/* Detail panel */}
        {selected && (
          <aside className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div className={styles.detailName}>{selected.Name}</div>
              <div className={styles.detailActions}>
                <Button variant="ghost" onClick={() => setShareModal(true)}>Share</Button>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>

            {selected.Login && (
              <div className={styles.fields}>
                {selected.Login.Username && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Username</span>
                    <div className={styles.fieldValueRow}>
                      <span className={styles.fieldMono}>{selected.Login.Username}</span>
                      <button className={`${styles.copyBtn} ${copied === 'user' ? styles.flashed : ''}`}
                        onClick={() => copy(selected.Login.Username, 'user')}>Copy</button>
                    </div>
                  </div>
                )}
                {selected.Login.Password && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Password</span>
                    <div className={styles.fieldValueRow}>
                      <span className={styles.fieldMono}>{revealed ? selected.Login.Password : '••••••••••••'}</span>
                      <button className={styles.copyBtn} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Show'}</button>
                      <button className={`${styles.copyBtn} ${copied === 'pass' ? styles.flashed : ''}`}
                        onClick={() => copy(selected.Login.Password, 'pass')}>Copy</button>
                    </div>
                  </div>
                )}
                {selected.Login.Uris?.[0]?.Uri && (
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>URL</span>
                    <a href={selected.Login.Uris[0].Uri} target="_blank" className={styles.fieldMono}>{selected.Login.Uris[0].Uri}</a>
                  </div>
                )}
              </div>
            )}

            {selected.Notes && (
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Notes</span>
                <p className={styles.notes}>{selected.Notes}</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Share modal */}
      {shareModal && (
        <div className={styles.modalBackdrop} onClick={() => { setShareModal(false); setShareUrl(''); setShareError(''); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Share — {selected?.Name}</div>
            <div className={styles.modalFields}>
              <Input label="TTL (hours)" type="number" value={shareTtl} onChange={e => setShareTtl(e.target.value)} min="1" max="720" />
              <Input label="Max views" type="number" value={shareViews} onChange={e => setShareViews(e.target.value)} min="1" max="100" />
            </div>
            {shareError && <div className={styles.shareError}>{shareError}</div>}
            {shareUrl && (
              <div className={styles.shareUrlBox}>
                <span className={styles.shareUrlLabel}>Share URL</span>
                <div className={styles.shareUrlRow}>
                  <span className={styles.shareUrlText}>{shareUrl}</span>
                  <button className={`${styles.copyBtn} ${copied === 'share' ? styles.flashed : ''}`}
                    onClick={() => copy(shareUrl, 'share')}>Copy</button>
                </div>
              </div>
            )}
            <div className={styles.modalFooter}>
              <Button variant="ghost" onClick={() => { setShareModal(false); setShareUrl(''); setShareError(''); }}>Cancel</Button>
              <Button variant="primary" loading={shareLoading} onClick={doShare}>Generate Link</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
