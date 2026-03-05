'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deriveLoginKey } from '@/lib/crypto';
import { useAuth } from '@/lib/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './login.module.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth(s => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      setStatus('Connecting to vault…');
      const pre = await fetch(`${BASE}/api/vault/token/prelogin`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email }) }).then(r => r.json());

      setStatus('Deriving keys…');
      const hash = await deriveLoginKey(email, password, pre.KdfIterations ?? 600000);

      setStatus('Authenticating…');
      const form = new URLSearchParams({ grant_type:'password', username:email, password:hash, scope:'api offline_access', client_id:'web' });
      const vault = await fetch(`${BASE}/api/vault/token`, { method:'POST', headers:{'content-type':'application/x-www-form-urlencoded'}, body:form.toString() }).then(r => r.json());
      if (!vault.access_token) throw new Error('Vault login failed');

      setStatus('Starting session…');
      const { csrfToken } = await fetch(`${BASE}/api/auth/session`, {
        method:'POST', credentials:'include', headers:{'content-type':'application/json'},
        body: JSON.stringify({ userId: vault.Key ?? email, email, role:'owner' })
      }).then(r => r.json());

      sessionStorage.setItem('crm_csrf', csrfToken);
      sessionStorage.setItem('vault_token', vault.access_token);
      setAuth({ email, userId: vault.Key ?? email, csrfToken, vaultToken: vault.access_token });
      setStatus('Authenticated ✓');
      router.push('/vault');
    } catch (err: any) {
      setError(err.message ?? 'Login failed'); setStatus('');
    } finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🔐 <span>VAULT OPS</span></div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Master Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••" required />
          {error && <div className={styles.error}>{error}</div>}
          {status && <div className={styles.status}>{status}</div>}
          <Button type="submit" variant="primary" loading={loading} style={{width:'100%',justifyContent:'center'}}>
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}
