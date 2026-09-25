/** Все размеры — в миллиметрах. */

export type OpeningType = 'window' | 'door' | 'niche' | 'socket' | 'pipe' | 'other'

export const OPENING_LABELS: Record<OpeningType, string> = {
  window: 'Окно',
  door: 'Дверь',
  niche: 'Ниша',
  socket: 'Розетка/вывод',
  pipe: 'Труба',
  other: 'Другое',
}

export interface Wall {
  id: string
  /** Длина стены, мм. null — ещё не замерена. */
  length: number | null
  /** Внутренний угол в конце стены (между этой и следующей), градусы. */
  angle: number
}

export interface Opening {
  id: string
  type: OpeningType
  wallId: string
  /** Отступ от начала стены до левого края проёма, мм. */
  offset: number | null
  width: number | null
  height: number | null
  /** Высота от пола до низа (подоконник, розетка), мм. */
  elevation: number | null
  note: string
}

export interface Room {
  id: string
  name: string
  /** Высота потолка, мм. */
  height: number | null
  walls: Wall[]
  openings: Opening[]
  note: string
}

export interface Order {
  id: string
  client: string
  phone: string
  address: string
  note: string
  createdAt: string
  rooms: Room[]
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function newRoom(name = 'Кухня', wallsCount = 4): Room {
  return {
    id: uid(),
    name,
    height: null,
    walls: Array.from({ length: wallsCount }, () => ({ id: uid(), length: null, angle: 90 })),
    openings: [],
    note: '',
  }
}

export function newOrder(): Order {
  return {
    id: uid(),
    client: '',
    phone: '',
    address: '',
    note: '',
    createdAt: new Date().toISOString(),
    rooms: [newRoom()],
  }
}

export function newOpening(wallId: string, type: OpeningType = 'window'): Opening {
  return { id: uid(), type, wallId, offset: null, width: null, height: null, elevation: null, note: '' }
}

/** Имя стены по индексу: A, B, C… */
export const wallName = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
