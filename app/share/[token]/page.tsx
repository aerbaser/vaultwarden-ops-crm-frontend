'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import styles from './share.module.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/share/open`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ token }) })
      .then(r => r.json()).then(setData).catch(e => setError(e.message));
  }, [token]);

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const ttlMin = data ? Math.floor((data.secondsLeft ?? 0) / 60) : 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}><span className={styles.logo}>🔐 VAULT OPS</span><span className={styles.sub}>Secure Share</span></div>
      <div className={styles.card}>
        {error && <div className={styles.error}>{error}</div>}
        {!data && !error && <div className={styles.loading}>Loading…</div>}
        {data && !data.ok && <div className={styles.expired}><Badge color="danger">Expired</Badge><p>This link has expired or been revoked.</p></div>}
        {data?.ok && (
          <>
            <div className={styles.meta}>
              <Badge color={ttlMin < 60 ? 'amber' : 'teal'}>{ttlMin}m remaining</Badge>
              <Badge color="muted">{data.viewsLeft} views left</Badge>
            </div>
            <div className={styles.field}><span className={styles.label}>Username</span><span className={styles.mono}>{data.username ?? '—'}</span></div>
            <div className={styles.field}>
              <span className={styles.label}>Password</span>
              <div className={styles.passwordRow}>
                <span className={styles.mono}>{revealed ? (data.password ?? '—') : '••••••••••'}</span>
                <button className={styles.revealBtn} onClick={() => setRevealed(!revealed)}>{revealed ? 'Hide' : 'Show'}</button>
                {data.password && <button className={`${styles.copyBtn} ${copied ? styles.flashed : ''}`} onClick={() => copy(data.password)}>Copy</button>}
              </div>
            </div>
            {data.url && <div className={styles.field}><span className={styles.label}>URL</span><a href={data.url} className={styles.mono} target="_blank">{data.url}</a></div>}
          </>
        )}
      </div>
    </div>
  );
}
