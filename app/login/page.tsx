'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deriveMasterKey, deriveLoginKey, decryptProfileKey } from '@/lib/crypto';
import { useAuth, useVault } from '@/lib/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './login.module.css';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth(s => s.setAuth);
  const { setSymKey, setFolders, setCiphers } = useVault();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      // 1. Prelogin → KDF params
      setStatus('Connecting to vault…');
      const pre = await fetch(`${BASE}/api/vault/token/prelogin`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(r => r.json());

      // 2. Derive master key + login hash
      setStatus('Deriving keys…');
      const masterKey = await deriveMasterKey(email, password, pre.KdfIterations ?? 600000);
      const hash = await deriveLoginKey(email, password, pre.KdfIterations ?? 600000);

      // 3. Vault token
      setStatus('Authenticating…');
      let deviceId = localStorage.getItem('vw_device_id');
      if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('vw_device_id', deviceId); }
      const form = new URLSearchParams({
        grant_type: 'password', username: email, password: hash,
        scope: 'api offline_access', client_id: 'web',
        device_identifier: deviceId, device_name: 'vault-ops-crm', device_type: '10',
      });
      const vault = await fetch(`${BASE}/api/vault/token`, {
        method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      }).then(r => r.json());
      if (!vault.access_token) throw new Error(vault.ErrorModel?.Message ?? 'Vault login failed');

      // 4. Sync vault → decrypt profile key → user symmetric key
      setStatus('Syncing vault…');
      const sync = await fetch(`${BASE}/api/vault/sync`, {
        headers: { authorization: `Bearer ${vault.access_token}` },
      }).then(r => r.json());

      const profileKeyStr = sync?.Profile?.Key;
      if (profileKeyStr) {
        const symKey = await decryptProfileKey(profileKeyStr, masterKey);
        setSymKey(symKey);
      }

      // Store folders + ciphers (raw; decryption happens in vault page)
      setFolders(sync?.Folders ?? []);
      setCiphers(sync?.Ciphers ?? []);

      // 5. CRM session
      setStatus('Starting session…');
      const sessionRes = await fetch(`${BASE}/api/auth/session`, {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: email, email, role: 'owner' }),
      }).then(r => r.json());

      const csrfToken = sessionRes?.csrfToken ?? '';
      sessionStorage.setItem('crm_csrf', csrfToken);
      sessionStorage.setItem('vault_token', vault.access_token);
      setAuth({ email, userId: email, csrfToken, vaultToken: vault.access_token });

      setStatus('Authenticated ✓');
      router.push('/vault');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setStatus('');
    } finally { setLoading(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>🔐 <span>VAULT OPS</span></div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <Input label="Master Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" required />
          {error && <div className={styles.error}>{error}</div>}
          {status && <div className={styles.status}>{status}</div>}
          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
            Unlock
          </Button>
        </form>
      </div>
    </div>
  );
}
