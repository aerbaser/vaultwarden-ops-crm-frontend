'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store';
import Button from '@/components/ui/Button';
import styles from './AppShell.module.css';

const NAV = [
  { id: 'vault',      label: 'Vault',      href: '/vault' },
  { id: 'contacts',   label: 'Contacts',   href: '/contacts' },
  { id: 'projects',   label: 'Projects',   href: '/projects' },
  { id: 'assets',     label: 'Assets',     href: '/assets' },
  { id: 'operations', label: 'Operations', href: '/operations' },
  { id: 'audit',      label: 'Audit',      href: '/audit' },
];

interface Props {
  nav: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  topAction?: React.ReactNode;
}

export default function AppShell({ nav, children, sidebar, topAction }: Props) {
  const router = useRouter();
  const { email, lock } = useAuth();

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>🔐 <span>VAULT OPS</span></div>
        <nav className={styles.nav}>
          {NAV.map(n => (
            <a key={n.id} href={n.href}
              className={`${styles.navLink} ${nav === n.id ? styles.navActive : ''}`}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className={styles.topRight}>
          {topAction}
          <span className={styles.emailLabel}>{email}</span>
          <Button variant="ghost" onClick={() => { lock(); router.push('/login'); }}>Lock</Button>
        </div>
      </header>
      <div className={styles.workspace}>
        {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
