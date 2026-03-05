'use client';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './operations.module.css';

function dueBadge(dateStr: string): { color: 'danger' | 'amber' | 'muted'; label: string } {
  if (!dateStr) return { color: 'muted', label: 'No due date' };
  const due = new Date(dateStr);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { color: 'danger', label: 'Overdue' };
  if (diff < 7) return { color: 'amber', label: `Due in ${Math.ceil(diff)}d` };
  return { color: 'muted', label: due.toLocaleDateString() };
}

export default function OperationsPage() {
  const [obligations, setObligations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', kind: 'subscription', amount: '', currency: 'USD', cadence: 'monthly', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/api/obligations').then(setObligations).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const created = await apiPost('/api/obligations', form);
      setObligations(prev => [created, ...prev]);
      setShowForm(false);
      setForm({ name: '', kind: 'subscription', amount: '', currency: 'USD', cadence: 'monthly', dueDate: '' });
    } catch (e: any) { setError(e.message ?? 'Failed'); } finally { setSaving(false); }
  }

  const nav = [
    { label: 'Vault', href: '/vault' },
    { label: 'Operations', href: '/operations', active: true },
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
          <Button variant="primary" onClick={() => setShowForm(true)}>New Subscription</Button>
        </div>
      </header>

      <div className={styles.content}>
        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && obligations.length === 0 && <div className={styles.empty}>No obligations yet.</div>}
        <div className={styles.grid}>
          {obligations.map((o: any) => {
            const due = dueBadge(o.dueDate);
            return (
              <div key={o.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{o.name}</span>
                  <Badge color={o.kind === 'subscription' ? 'teal' : 'amber'}>{o.kind}</Badge>
                </div>
                <div className={styles.amount}>
                  <span className={styles.amountValue}>{o.amount}</span>
                  <span className={styles.currency}>{o.currency}</span>
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.cadence}>{o.cadence}</span>
                  <Badge color={due.color}>{due.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <div className={styles.modalBackdrop} onClick={() => setShowForm(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>New Subscription</div>
            <form onSubmit={submit} className={styles.modalForm}>
              <Input label="Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
              <div className={styles.row}>
                <Input label="Amount" type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))} />
                <Input label="Currency" value={form.currency} onChange={e => setForm(f => ({...f, currency: e.target.value}))} />
              </div>
              <div className={styles.row}>
                <div className={styles.selectWrap}>
                  <label className={styles.selectLabel}>Cadence</label>
                  <select className={styles.select} value={form.cadence} onChange={e => setForm(f => ({...f, cadence: e.target.value}))}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="weekly">Weekly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
                <Input label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({...f, dueDate: e.target.value}))} />
              </div>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.modalFooter}>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button variant="primary" type="submit" loading={saving}>Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
