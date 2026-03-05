'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './contacts.module.css';

type Channel = { type: string; value: string; label?: string };
type Contact = { id: string; name: string; role?: string; channels: Channel[]; createdAt: string };

const CHANNEL_ICONS: Record<string, string> = { email: '@', phone: '☎', slack: '#', telegram: '✈', discord: '◈', other: '⊕' };
const CHANNEL_TYPES = ['email', 'phone', 'slack', 'telegram', 'discord', 'other'];

function authCheck(router: ReturnType<typeof useRouter>) {
  if (typeof window !== 'undefined' && !sessionStorage.getItem('vault_token')) router.push('/login');
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState('');

  // Create form state
  const [cName, setCName] = useState('');
  const [cRole, setCRole] = useState('');
  const [cChannels, setCChannels] = useState<Channel[]>([{ type: 'email', value: '' }]);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => { authCheck(router); apiGet('/api/contacts').then(setContacts).catch(() => {}).finally(() => setLoading(false)); }, [router]);

  function copy(text: string, key: string) { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); }

  async function createContact(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaveErr('');
    try {
      const created = await apiPost('/api/contacts', { name: cName, role: cRole || undefined, channels: cChannels.filter(c => c.value.trim()) });
      setContacts(prev => [created, ...prev]);
      setShowCreate(false); setCName(''); setCRole(''); setCChannels([{ type: 'email', value: '' }]);
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  }

  function addChannel() { setCChannels(prev => [...prev, { type: 'email', value: '' }]); }
  function updateChannel(i: number, field: keyof Channel, val: string) {
    setCChannels(prev => prev.map((c, j) => j === i ? { ...c, [field]: val } : c));
  }
  function removeChannel(i: number) { setCChannels(prev => prev.filter((_, j) => j !== i)); }

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.role ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell nav="contacts" topAction={<Button variant="primary" onClick={() => setShowCreate(true)}>New Contact</Button>}>
      <div className={styles.layout}>
        {/* List */}
        <div className={styles.listPanel}>
          <div className={styles.searchBar}>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" />
          </div>
          {loading && <div className={styles.empty}>Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className={styles.empty}><em style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-3)' }}>No contacts yet</em></div>
          )}
          {filtered.map(c => (
            <button key={c.id} className={`${styles.row} ${selected?.id === c.id ? styles.rowActive : ''}`}
              onClick={() => setSelected(c)}>
              <div className={styles.rowAvatar}>{c.name[0].toUpperCase()}</div>
              <div className={styles.rowInfo}>
                <span className={styles.rowName}>{c.name}</span>
                {c.role && <span className={styles.rowRole}>{c.role}</span>}
              </div>
              {c.channels.length > 0 && <span className={styles.channelCount}>{c.channels.length}</span>}
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className={styles.detail}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-3)', fontSize: '15px' }}>
                Select a contact
              </span>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailAvatar}>{selected.name[0].toUpperCase()}</div>
                <div>
                  <div className={styles.detailName}>{selected.name}</div>
                  {selected.role && <Badge color="muted">{selected.role}</Badge>}
                </div>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className={styles.channels}>
                <div className={styles.sectionLabel}>Channels</div>
                {selected.channels.length === 0 && <div className={styles.noChannels}>No channels</div>}
                {selected.channels.map((ch, i) => (
                  <div key={i} className={styles.channelRow}>
                    <span className={styles.channelIcon}>{CHANNEL_ICONS[ch.type] ?? '⊕'}</span>
                    <span className={styles.channelType}>{ch.type}</span>
                    <span className={styles.channelValue}>{ch.value}</span>
                    <button className={`${styles.copyBtn} ${copied === `ch-${i}` ? styles.flashed : ''}`}
                      onClick={() => copy(ch.value, `ch-${i}`)}>Copy</button>
                  </div>
                ))}
              </div>
              <div className={styles.meta}>
                <span className={styles.metaLabel}>Created</span>
                <span className={styles.metaValue}>{new Date(selected.createdAt).toLocaleDateString()}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className={styles.backdrop} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>New Contact</div>
            <form onSubmit={createContact} className={styles.modalForm}>
              <Input label="Name" value={cName} onChange={e => setCName(e.target.value)} required />
              <Input label="Role (optional)" value={cRole} onChange={e => setCRole(e.target.value)} placeholder="e.g. CEO, Engineer" />
              <div className={styles.channelsSection}>
                <div className={styles.sectionLabel}>Channels</div>
                {cChannels.map((ch, i) => (
                  <div key={i} className={styles.channelFormRow}>
                    <select className={styles.typeSelect} value={ch.type} onChange={e => updateChannel(i, 'type', e.target.value)}>
                      {CHANNEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input className={styles.valueInput} placeholder="value" value={ch.value} onChange={e => updateChannel(i, 'value', e.target.value)} />
                    {cChannels.length > 1 && <button type="button" className={styles.removeBtn} onClick={() => removeChannel(i)}>✕</button>}
                  </div>
                ))}
                <button type="button" className={styles.addChannelBtn} onClick={addChannel}>+ Add channel</button>
              </div>
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
