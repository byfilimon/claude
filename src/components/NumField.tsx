import { useEffect, useRef } from 'react'

interface Props {
  label: string
  value: number | null
  onChange(v: number | null): void
  /** Поле — текущая цель для замера с рулетки. */
  active?: boolean
  onActivate?(): void
  suffix?: string
}

/** Числовое поле; при active=true подсвечено — сюда придёт следующий замер. */
export function NumField({ label, value, onChange, active, onActivate, suffix = 'мм' }: Props) {
  const ref = useRef<HTMLLabelElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [active])
  return (
    <label ref={ref} className={'num' + (active ? ' num--active' : '')} onClick={onActivate}>
      <span className="num__label">{label}</span>
      <input
        inputMode="numeric"
        value={value ?? ''}
        placeholder="—"
        onFocus={onActivate}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d]/g, '')
          onChange(t === '' ? null : Number(t))
        }}
      />
      <span className="num__suffix">{suffix}</span>
    </label>
  )
}
