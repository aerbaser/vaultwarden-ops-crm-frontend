'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import styles from './audit.module.css';

function actionColor(action: string): 'teal' | 'amber' | 'danger' | 'muted' {
  if (['create', 'login', 'share'].includes(action)) return 'teal';
  if (['update', 'unlock'].includes(action)) return 'amber';
  if (['delete', 'lock', 'revoke'].includes(action)) return 'danger';
  return 'muted';
}

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/api/audit/events').then(setEvents).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const nav = [
    { label: 'Vault', href: '/vault' },
    { label: 'Operations', href: '/operations' },
    { label: 'Audit', href: '/audit', active: true },
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
      </header>

      <div className={styles.content}>
        <div className={styles.pageTitle}>Audit Timeline</div>
        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && events.length === 0 && <div className={styles.empty}>No events recorded.</div>}
        <div className={styles.timeline}>
          {events.map((ev: any, i: number) => (
            <div key={ev.id ?? i} className={styles.event}>
              <div className={styles.dot}/>
              <div className={styles.eventCard}>
                <div className={styles.eventHeader}>
                  <Badge color={actionColor(ev.action)}>{ev.action}</Badge>
                  <span className={styles.entity}>{ev.entity}</span>
                  <span className={styles.ts}>{new Date(ev.timestamp ?? ev.createdAt).toISOString().replace('T', ' ').slice(0, 19)}</span>
                </div>
                <div className={styles.eventFooter}>
                  <span className={styles.actor}>{ev.actorEmail ?? ev.actor ?? 'system'}</span>
                  {ev.meta && <span className={styles.meta}>{typeof ev.meta === 'string' ? ev.meta : JSON.stringify(ev.meta)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
