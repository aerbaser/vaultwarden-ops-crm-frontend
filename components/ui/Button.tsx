import styles from './Button.module.css';
type Variant = 'primary' | 'ghost' | 'danger';
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean; }
export default function Button({ variant='ghost', loading, children, className='', ...props }: Props) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${loading ? styles.loading : ''} ${className}`} disabled={loading||props.disabled} {...props}>
      {loading ? <span className={styles.spinner}/> : children}
    </button>
  );
}
