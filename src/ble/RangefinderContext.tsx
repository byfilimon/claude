import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { GlmRangefinder, SimulatedRangefinder, type Rangefinder } from './glm'

type Status = 'disconnected' | 'connecting' | 'connected'
type Listener = (mm: number) => void

interface Ctx {
  status: Status
  deviceName: string
  last: number | null
  log: string[]
  error: string | null
  isSimulator: boolean
  connectGlm(): Promise<void>
  connectSimulator(): Promise<void>
  disconnect(): void
  simulate(): void
  /** Подписка на замеры; возвращает функцию отписки. */
  subscribe(l: Listener): () => void
}

const RangefinderCtx = createContext<Ctx | null>(null)

export function RangefinderProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('disconnected')
  const [deviceName, setDeviceName] = useState('')
  const [last, setLast] = useState<number | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const dev = useRef<Rangefinder | null>(null)
  const listeners = useRef(new Set<Listener>())

  const events = {
    onMeasurement: (mm: number) => {
      setLast(mm)
      navigator.vibrate?.(40)
      listeners.current.forEach((l) => l(mm))
    },
    onLog: (line: string) =>
      setLog((l) => [...l.slice(-99), `${new Date().toLocaleTimeString()} ${line}`]),
    onDisconnect: () => {
      setStatus('disconnected')
      dev.current = null
    },
  }

  const connect = async (d: Rangefinder) => {
    dev.current?.disconnect()
    setError(null)
    setStatus('connecting')
    try {
      await d.connect()
      dev.current = d
      setDeviceName(d.name)
      setStatus('connected')
    } catch (e) {
      setStatus('disconnected')
      const msg = e instanceof Error ? e.message : String(e)
      // отмена выбора устройства пользователем — не ошибка
      if (!/cancel/i.test(msg)) setError(msg)
      events.onLog(`Ошибка: ${msg}`)
    }
  }

  const subscribe = useCallback((l: Listener) => {
    listeners.current.add(l)
    return () => void listeners.current.delete(l)
  }, [])

  useEffect(() => () => dev.current?.disconnect(), [])

  const value: Ctx = {
    status,
    deviceName,
    last,
    log,
    error,
    isSimulator: dev.current instanceof SimulatedRangefinder,
    connectGlm: () => connect(new GlmRangefinder(events)),
    connectSimulator: () => connect(new SimulatedRangefinder(events)),
    disconnect: () => dev.current?.disconnect(),
    simulate: () => {
      if (dev.current instanceof SimulatedRangefinder) dev.current.measure()
    },
    subscribe,
  }
  return <RangefinderCtx.Provider value={value}>{children}</RangefinderCtx.Provider>
}

export function useRangefinder() {
  const c = useContext(RangefinderCtx)
  if (!c) throw new Error('RangefinderProvider missing')
  return c
}

/** Вызывает handler на каждый новый замер (актуальная версия handler без переподписки). */
export function useMeasurement(handler: Listener) {
  const { subscribe } = useRangefinder()
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => subscribe((mm) => ref.current(mm)), [subscribe])
}
