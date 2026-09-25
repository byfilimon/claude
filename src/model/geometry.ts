import type { Room } from './types'

export interface Pt {
  x: number
  y: number
}

export interface Plan {
  /** Вершины контура; points[i] — начало стены i. Последняя точка — конец последней стены. */
  points: Pt[]
  /** Расстояние между концом последней стены и началом первой, мм. 0 — контур замкнут. */
  closureGap: number
  /** Все ли длины стен заполнены. */
  complete: boolean
}

/**
 * Строит контур комнаты по длинам стен и внутренним углам.
 * Обход по часовой стрелке (в координатах с осью Y вниз, как на экране),
 * первая стена идёт вправо от точки (0,0). Незамеренные стены рисуются условной длиной.
 */
export function buildPlan(room: Room, placeholder = 1000): Plan {
  const pts: Pt[] = [{ x: 0, y: 0 }]
  let heading = 0 // радианы, 0 — вправо
  let complete = true
  for (const w of room.walls) {
    const len = w.length ?? placeholder
    if (w.length == null) complete = false
    const p = pts[pts.length - 1]
    pts.push({ x: p.x + len * Math.cos(heading), y: p.y + len * Math.sin(heading) })
    // поворот по часовой стрелке на внешний угол
    heading += ((180 - w.angle) * Math.PI) / 180
  }
  const last = pts[pts.length - 1]
  return { points: pts, closureGap: Math.hypot(last.x, last.y), complete }
}

export function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) }
}

/** Площадь многоугольника (формула Гаусса), м². */
export function areaM2(pts: Pt[]): number {
  let s = 0
  for (let i = 0; i < pts.length - 1; i++) s += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y
  return Math.abs(s) / 2 / 1e6
}

/** Точка на стене на расстоянии d от её начала и единичные векторы вдоль стены и внутрь комнаты. */
export function alongWall(a: Pt, b: Pt, d: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
  const ux = (b.x - a.x) / len
  const uy = (b.y - a.y) / len
  // при обходе по часовой стрелке (Y вниз) внутренность комнаты — справа: (-uy, ux)
  return { p: { x: a.x + ux * d, y: a.y + uy * d }, u: { x: ux, y: uy }, n: { x: -uy, y: ux } }
}

/** Проблемы в замере: незакрытый контур, проёмы за пределами стены и т.п. */
export function validateRoom(room: Room, tolerance = 20): string[] {
  const issues: string[] = []
  const plan = buildPlan(room)
  if (plan.complete && plan.closureGap > tolerance) {
    issues.push(`Контур не замыкается: расхождение ${Math.round(plan.closureGap)} мм. Проверьте длины и углы.`)
  }
  room.walls.forEach((w, i) => {
    if (w.length == null) return
    for (const o of room.openings.filter((o) => o.wallId === w.id)) {
      if (o.offset != null && o.width != null && o.offset + o.width > w.length + tolerance) {
        issues.push(`Стена ${String.fromCharCode(65 + i)}: элемент выходит за край стены.`)
      }
    }
  })
  if (room.height != null) {
    for (const o of room.openings) {
      if (o.elevation != null && o.height != null && o.elevation + o.height > room.height + tolerance) {
        issues.push('Элемент выше потолка — проверьте высоту.')
      }
    }
  }
  return issues
}
