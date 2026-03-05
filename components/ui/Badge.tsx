import styles from './Badge.module.css';
type Color = 'amber'|'teal'|'danger'|'muted';
export default function Badge({ color='muted', children }: { color?: Color; children: React.ReactNode }) {
  return <span className={`${styles.badge} ${styles[color]}`}>{children}</span>;
}
