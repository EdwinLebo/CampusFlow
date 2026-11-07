import {
  cloneElement,
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react'
import { ArrowUpRight, CircleAlert, Plus, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="CampusFlow home">
      <span className="brand-mark">
        <Zap size={19} fill="currentColor" />
      </span>
      {!small && (
        <span>
          Campus<span>Flow</span>
        </span>
      )}
    </Link>
  )
}
export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'plain' | 'danger'
  children: ReactNode
}) {
  return (
    <button {...props} className={'button ' + variant + ' ' + className}>
      {children}
    </button>
  )
}
export function Heading({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        {kicker && <div className="eyebrow">{kicker}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  )
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>{children}</section>
}
export function CardTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="card-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
export function Empty({
  title,
  detail,
  action,
  onAction,
}: {
  title: string
  detail: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Zap size={18} />
      </span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action && (
        <Button variant="outline" onClick={onAction}>
          <Plus size={15} />
          {action}
        </Button>
      )}
    </div>
  )
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <p className="error" role="alert">
      <CircleAlert size={17} />
      {message}
    </p>
  ) : null
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(100, Math.max(0, Math.round(value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: Math.min(100, Math.max(0, value)) + '%' }} />
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={wide ? 'wide' : ''}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="dialog-inner">
        <header>
          <h2>{title}</h2>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
export function SectionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="section-link">
      {children}
      <ArrowUpRight size={14} />
    </Link>
  )
}
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={'pill ' + tone}>{children}</span>
}
export function ModuleDot({ color }: { color?: string }) {
  return <span className="module-dot" style={{ background: color || 'var(--primary)' }} />
}
export function Confirm({
  title,
  detail,
  action = 'Delete',
  onClose,
  onConfirm,
  busy = false,
}: {
  title: string
  detail: string
  action?: string
  onClose: () => void
  onConfirm: () => void
  busy?: boolean
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{detail}</p>
      <div className="form-actions">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={busy} onClick={onConfirm}>
          {busy ? 'Working…' : action}
        </Button>
      </div>
    </Modal>
  )
}
export function Field({
  label,
  children,
  help,
}: {
  label: string
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>
  help?: string
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': help ? id + '-help' : undefined })}
      {help && <small id={id + '-help'}>{help}</small>}
    </div>
  )
}
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  disabled = false,
}: {
  items: readonly T[]
  value: T
  onChange: (value: T) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="segmented" aria-label={label} role="group">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          disabled={disabled}
          aria-pressed={item === value}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
export function SearchInput({
  value,
  onChange,
  label = 'Search',
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  return (
    <input
      className="search-input"
      type="search"
      aria-label={label}
      placeholder={label + '…'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Loading() {
  return (
    <div className="loading">
      <Brand />
      <span className="spinner" />
      <p role="status">Opening your workspace…</p>
    </div>
  )
}
