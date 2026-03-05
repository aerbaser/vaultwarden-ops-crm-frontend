'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { decryptField } from '@/lib/crypto';
import { useAuth, useVault } from '@/lib/store';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './vault.module.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

type VaultCipher = {
  Id: string; Name: string; Type: number; FolderId: string | null;
  Login?: { Username?: string; Password?: string; Uris?: { Uri: string }[] };
  Card?: { Brand?: string; CardholderName?: string; Number?: string; ExpMonth?: string; ExpYear?: string };
  Notes?: string;
};

type DecryptedCipher = {
  id: string; name: string; type: number; folderId: string | null;
  username: string; password: string; uri: string;
  cardBrand: string; cardNumber: string; notes: string;
};

type VaultFolder = { Id: string; Name: string };

function typeLabel(t: number) {
  return t === 1 ? 'login' : t === 2 ? 'note' : t === 3 ? 'card' : t === 4 ? 'identity' : 'item';
}
function typeDotClass(t: number, s: Record<string, string>) {
  return t === 1 ? s.dotTeal : t === 3 ? s.dotAmber : s.dotMuted;
}

export default function VaultPage() {
  const router = useRouter();
  const { email, vaultToken, lock } = useAuth();
  const { symKey, ciphers, folders, setCiphers, setFolders, selectedProject, selectedFolder, setProjects, select } = useVault();
  const [loading, setLoading] = useState(true);
  const [decrypted, setDecrypted] = useState<DecryptedCipher[]>([]);
  const [selected, setSelected] = useState<DecryptedCipher | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState('');
  const [projects, setLocalProjects] = useState<{ id: string; name: string }[]>([]);

  // Share modal
  const [shareModal, setShareModal] = useState(false);
  const [shareTtl, setShareTtl] = useState('24');
  const [shareViews, setShareViews] = useState('3');
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');

  const token = vaultToken || (typeof window !== 'undefined' ? sessionStorage.getItem('vault_token') ?? '' : '');

  // Decrypt ciphers when symKey + ciphers are available
  const decryptAll = useCallback(async (raw: VaultCipher[], key: Uint8Array) => {
    const results: DecryptedCipher[] = await Promise.all(
      raw.map(async (c) => ({
        id: c.Id,
        name: await decryptField(c.Name, key),
        type: c.Type,
        folderId: c.FolderId,
        username: c.Login?.Username ? await decryptField(c.Login.Username, key) : '',
        password: c.Login?.Password ? await decryptField(c.Login.Password, key) : '',
        uri: c.Login?.Uris?.[0]?.Uri ? await decryptField(c.Login.Uris[0].Uri, key) : '',
        cardBrand: c.Card?.Brand ? await decryptField(c.Card.Brand, key) : '',
        cardNumber: c.Card?.Number ? await decryptField(c.Card.Number, key) : '',
        notes: c.Notes ? await decryptField(c.Notes, key) : '',
      }))
    );
    setDecrypted(results);
  }, []);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }

    // Load CRM projects
    apiGet('/api/projects').then((p) => { setProjects(p ?? []); setLocalProjects(p ?? []); }).catch(() => {});

    // If ciphers already in store (from login), just decrypt
    if (ciphers.length > 0 && symKey) {
      decryptAll(ciphers as VaultCipher[], symKey).finally(() => setLoading(false));
      return;
    }

    // Otherwise fetch fresh
    fetch(`${BASE}/api/vault/sync`, { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(sync => {
        const rawCiphers = sync?.Ciphers ?? [];
        const rawFolders = sync?.Folders ?? [];
        setCiphers(rawCiphers);
        setFolders(rawFolders);
        if (symKey) return decryptAll(rawCiphers, symKey);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, symKey]);

  // Also decrypt when symKey arrives after ciphers
  useEffect(() => {
    if (symKey && ciphers.length > 0 && decrypted.length === 0) {
      decryptAll(ciphers as VaultCipher[], symKey);
    }
  }, [symKey, ciphers, decrypted.length, decryptAll]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(''), 2000);
  }

  async function doShare() {
    if (!selected) return;
    setShareLoading(true); setShareError(''); setShareUrl('');
    try {
      const res = await apiPost('/api/share/from-vault', {
        itemName: selected.name, ttlHours: Number(shareTtl), maxViews: Number(shareViews),
      });
      setShareUrl(res.url ?? '');
    } catch (e: unknown) {
      setShareError(e instanceof Error ? e.message : 'Share failed');
    } finally { setShareLoading(false); }
  }

  // Decrypt folder names
  const decryptedFolders: { id: string; name: string }[] = [];
  useEffect(() => {
    if (!symKey) return;
    (folders as VaultFolder[]).forEach(async (f) => {
      const name = await decryptField(f.Name, symKey);
      decryptedFolders.push({ id: f.Id, name });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symKey, folders]);

  const [folderNames, setFolderNames] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!symKey || !folders.length) return;
    Promise.all((folders as VaultFolder[]).map(async f => ({
      id: f.Id,
      name: await decryptField(f.Name, symKey),
    }))).then(setFolderNames);
  }, [symKey, folders]);

  const filteredCiphers = decrypted.filter(c => {
    if (selectedFolder) return c.folderId === selectedFolder;
    if (selectedProject) return c.folderId === selectedProject;
    return true;
  });

  const nav = [
    { label: 'Vault', href: '/vault', active: true },
    { label: 'Operations', href: '/operations' },
    { label: 'Audit', href: '/audit' },
  ];

  return (
    <div className={styles.root}>
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
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>All Items</div>
            <button className={`${styles.sideItem} ${!selectedProject && !selectedFolder ? styles.sideItemActive : ''}`}
              onClick={() => select(null, null)}>
              All items
              <span className={styles.sideCount}>{decrypted.length}</span>
            </button>
          </div>

          {folderNames.length > 0 && (
            <div className={styles.sideSection}>
              <div className={styles.sideLabel}>Folders</div>
              {folderNames.map(f => (
                <button key={f.id}
                  className={`${styles.sideItem} ${selectedFolder === f.id ? styles.sideItemActive : ''}`}
                  onClick={() => select(null, f.id)}>
                  {f.name}
                  <span className={styles.sideCount}>{decrypted.filter(c => c.folderId === f.id).length}</span>
                </button>
              ))}
            </div>
          )}

          {projects.length > 0 && (
            <div className={styles.sideSection}>
              <div className={styles.sideLabel}>Projects</div>
              {projects.map((p) => (
                <button key={p.id}
                  className={`${styles.sideItem} ${selectedProject === p.id ? styles.sideItemActive : ''}`}
                  onClick={() => select(p.id, null)}>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          <div className={styles.sideSection}>
            <div className={styles.sideLabel}>Types</div>
            {[1, 2, 3, 4].map(t => {
              const count = decrypted.filter(c => c.type === t).length;
              if (!count) return null;
              return (
                <button key={t} className={styles.sideItem} onClick={() => select(null, null)}>
                  {typeLabel(t)}
                  <span className={styles.sideCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Cipher list */}
        <main className={styles.listPanel}>
          {loading ? (
            <div className={styles.emptyState}>Decrypting vault…</div>
          ) : filteredCiphers.length === 0 ? (
            <div className={styles.emptyState}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-3)' }}>
                No items in this view
              </span>
            </div>
          ) : (
            filteredCiphers.map((c) => (
              <button key={c.id}
                className={`${styles.cipherRow} ${selected?.id === c.id ? styles.cipherRowActive : ''}`}
                onClick={() => { setSelected(c); setRevealed(false); }}>
                <span className={`${styles.typeDot} ${typeDotClass(c.type, styles)}`} />
                <div className={styles.cipherInfo}>
                  <span className={styles.cipherName}>{c.name || '(encrypted)'}</span>
                  <span className={styles.cipherSub}>{c.username || typeLabel(c.type)}</span>
                </div>
                <Badge color={c.type === 1 ? 'teal' : c.type === 3 ? 'amber' : 'muted'}>{typeLabel(c.type)}</Badge>
              </button>
            ))
          )}
        </main>

        {/* Detail panel */}
        {selected && (
          <aside className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div className={styles.detailName}>{selected.name}</div>
              <div className={styles.detailActions}>
                <Button variant="ghost" onClick={() => setShareModal(true)}>Share</Button>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>
            </div>

            <div className={styles.fields}>
              {selected.type === 1 && (
                <>
                  {selected.username && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Username</span>
                      <div className={styles.fieldValueRow}>
                        <span className={styles.fieldMono}>{selected.username}</span>
                        <button className={`${styles.copyBtn} ${copied === 'user' ? styles.flashed : ''}`}
                          onClick={() => copy(selected.username, 'user')}>Copy</button>
                      </div>
                    </div>
                  )}
                  {selected.password && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Password</span>
                      <div className={styles.fieldValueRow}>
                        <span className={styles.fieldMono}>{revealed ? selected.password : '••••••••••••'}</span>
                        <button className={styles.copyBtn} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Show'}</button>
                        <button className={`${styles.copyBtn} ${copied === 'pass' ? styles.flashed : ''}`}
                          onClick={() => copy(selected.password, 'pass')}>Copy</button>
                      </div>
                    </div>
                  )}
                  {selected.uri && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>URL</span>
                      <a href={selected.uri} target="_blank" rel="noreferrer" className={styles.fieldMono}>{selected.uri}</a>
                    </div>
                  )}
                </>
              )}

              {selected.type === 3 && (
                <>
                  {selected.cardBrand && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Brand</span>
                      <span className={styles.fieldMono}>{selected.cardBrand}</span>
                    </div>
                  )}
                  {selected.cardNumber && (
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Card Number</span>
                      <div className={styles.fieldValueRow}>
                        <span className={styles.fieldMono}>{revealed ? selected.cardNumber : '•••• •••• •••• ' + selected.cardNumber.slice(-4)}</span>
                        <button className={styles.copyBtn} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Show'}</button>
                        <button className={`${styles.copyBtn} ${copied === 'card' ? styles.flashed : ''}`}
                          onClick={() => copy(selected.cardNumber, 'card')}>Copy</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selected.notes && (
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Notes</span>
                  <p className={styles.notes}>{selected.notes}</p>
                </div>
              )}

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Type</span>
                <Badge color={selected.type === 1 ? 'teal' : selected.type === 3 ? 'amber' : 'muted'}>{typeLabel(selected.type)}</Badge>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Share modal */}
      {shareModal && (
        <div className={styles.modalBackdrop} onClick={() => { setShareModal(false); setShareUrl(''); setShareError(''); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Share — {selected?.name}</div>
            <div className={styles.modalFields}>
              <Input label="TTL (hours)" type="number" value={shareTtl} onChange={e => setShareTtl(e.target.value)} />
              <Input label="Max views" type="number" value={shareViews} onChange={e => setShareViews(e.target.value)} />
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
