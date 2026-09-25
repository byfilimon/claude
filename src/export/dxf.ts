import { alongWall, bounds, buildPlan, type Pt } from '../model/geometry'
import { OPENING_LABELS, wallName, type Order, type Room } from '../model/types'

/**
 * Экспорт замера в DXF (AutoCAD R12, ASCII) — формат, который импортирует Базис-Мебельщик.
 * Координаты в миллиметрах. Кириллица кодируется в Windows-1251 ($DWGCODEPAGE ANSI_1251),
 * как ожидают русскоязычные CAD-программы.
 *
 * Состав: план комнаты (слои WALLS / OPENINGS / DIMS) и под ним развёртки каждой стены.
 */

const DEFAULT_HEIGHT = 2700

class DxfWriter {
  private out: string[] = []
  private pair(code: number, value: string | number) {
    this.out.push(String(code), typeof value === 'number' ? fmt(value) : value)
  }
  line(a: Pt, b: Pt, layer: string) {
    this.pair(0, 'LINE')
    this.pair(8, layer)
    this.pair(10, a.x); this.pair(20, a.y); this.pair(30, 0)
    this.pair(11, b.x); this.pair(21, b.y); this.pair(31, 0)
  }
  rect(x: number, y: number, w: number, h: number, layer: string) {
    const p = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]
    p.forEach((a, i) => this.line(a, p[(i + 1) % 4], layer))
  }
  text(at: Pt, height: number, s: string, layer: string, rotationDeg = 0, centered = true) {
    this.pair(0, 'TEXT')
    this.pair(8, layer)
    this.pair(10, at.x); this.pair(20, at.y); this.pair(30, 0)
    this.pair(40, height)
    this.pair(1, s)
    if (rotationDeg) this.pair(50, rotationDeg)
    if (centered) {
      this.pair(72, 1) // по центру по горизонтали
      this.pair(73, 2) // по середине по вертикали
      this.pair(11, at.x); this.pair(21, at.y); this.pair(31, 0)
    }
  }
  build(layers: Record<string, number>): string {
    const h: string[] = []
    const p = (c: number, v: string | number) => h.push(String(c), String(v))
    p(0, 'SECTION'); p(2, 'HEADER')
    p(9, '$ACADVER'); p(1, 'AC1009')
    p(9, '$DWGCODEPAGE'); p(3, 'ANSI_1251')
    p(9, '$INSUNITS'); p(70, 4)
    p(0, 'ENDSEC')
    p(0, 'SECTION'); p(2, 'TABLES')
    p(0, 'TABLE'); p(2, 'LAYER'); p(70, Object.keys(layers).length)
    for (const [name, color] of Object.entries(layers)) {
      p(0, 'LAYER'); p(2, name); p(70, 0); p(62, color); p(6, 'CONTINUOUS')
    }
    p(0, 'ENDTAB'); p(0, 'ENDSEC')
    p(0, 'SECTION'); p(2, 'ENTITIES')
    return [...h, ...this.out, '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n')
  }
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString()

/** DXF-строка для одной комнаты. */
export function roomToDxf(room: Room, title = ''): string {
  const d = new DxfWriter()
  const plan = buildPlan(room)
  // в DXF ось Y направлена вверх — отражаем план
  const pts = plan.points.map((p) => ({ x: p.x, y: -p.y }))
  const b = bounds(pts)
  const th = 100 // высота текста, мм

  d.text({ x: b.minX, y: b.maxY + 400 }, th * 1.5, `${title}${title ? ' — ' : ''}${room.name}`, 'DIMS', 0, false)

  room.walls.forEach((w, i) => {
    const a = pts[i]
    const c = pts[i + 1]
    d.line(a, c, 'WALLS')
    const { p, n } = alongWall(plan.points[i], plan.points[i + 1], (w.length ?? 1000) / 2)
    // подпись снаружи комнаты (n смотрит внутрь → берём -n), с учётом отражения по Y
    const label = { x: p.x - n.x * 200, y: -(p.y - n.y * 200) }
    const ang = (Math.atan2(-(plan.points[i + 1].y - plan.points[i].y), plan.points[i + 1].x - plan.points[i].x) * 180) / Math.PI
    const upright = ang > 90 || ang < -90 ? ang + 180 : ang
    d.text(label, th, `${wallName(i)}: ${w.length ?? '?'}`, 'DIMS', upright)

    for (const o of room.openings.filter((o) => o.wallId === w.id)) {
      if (o.offset == null || o.width == null) continue
      const s = alongWall(plan.points[i], plan.points[i + 1], o.offset)
      const e = alongWall(plan.points[i], plan.points[i + 1], o.offset + o.width)
      const inset = 60
      const s2 = { x: s.p.x + s.n.x * inset, y: -(s.p.y + s.n.y * inset) }
      const e2 = { x: e.p.x + e.n.x * inset, y: -(e.p.y + e.n.y * inset) }
      d.line({ x: s.p.x, y: -s.p.y }, s2, 'OPENINGS')
      d.line(s2, e2, 'OPENINGS')
      d.line(e2, { x: e.p.x, y: -e.p.y }, 'OPENINGS')
    }
  })

  // Развёртки стен под планом
  const H = room.height ?? DEFAULT_HEIGHT
  let x = b.minX
  const y0 = b.minY - 1500 - H
  room.walls.forEach((w, i) => {
    if (w.length == null) return
    d.rect(x, y0, w.length, H, 'WALLS')
    d.text({ x: x + w.length / 2, y: y0 - 200 }, th, `Стена ${wallName(i)}: ${w.length} × ${H}`, 'DIMS')
    for (const o of room.openings.filter((o) => o.wallId === w.id)) {
      if (o.offset == null || o.width == null) continue
      const oh = o.height ?? 50
      const oy = y0 + (o.elevation ?? 0)
      d.rect(x + o.offset, oy, o.width, oh, 'OPENINGS')
      d.text(
        { x: x + o.offset + o.width / 2, y: oy + oh / 2 },
        th * 0.7,
        `${OPENING_LABELS[o.type]} ${o.width}×${o.height ?? '?'}`,
        'DIMS',
      )
    }
    x += w.length + 800
  })

  return d.build({ WALLS: 7, OPENINGS: 5, DIMS: 3 })
}

/** Перевод строки в Windows-1251 (кириллица + ASCII; прочее — «?»). */
export function encodeCp1251(s: string): Uint8Array {
  const out = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c < 0x80) out[i] = c
    else if (c >= 0x410 && c <= 0x44f) out[i] = c - 0x350
    else if (c === 0x401) out[i] = 0xa8 // Ё
    else if (c === 0x451) out[i] = 0xb8 // ё
    else if (c === 0x2116) out[i] = 0xb9 // №
    else if (c === 0xd7) out[i] = 0x78 // × → x
    else if (c === 0x2014 || c === 0x2013) out[i] = 0x2d // тире → -
    else out[i] = 0x3f
  }
  return out
}

export function downloadRoomDxf(order: Order, room: Room) {
  const text = roomToDxf(room, [order.client, order.address].filter(Boolean).join(', '))
  const blob = new Blob([encodeCp1251(text) as BlobPart], { type: 'application/dxf' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '_').trim()
  a.download = `${safe(order.client || 'замер')}_${safe(room.name)}.dxf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
