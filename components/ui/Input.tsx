import styles from './Input.module.css';
interface Props extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; }
export default function Input({ label, className='', ...props }: Props) {
  return (
    <div className={styles.wrap}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={`${styles.input} ${className}`} {...props} />
    </div>
  );
}
