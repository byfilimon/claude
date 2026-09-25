import { alongWall, bounds, buildPlan } from '../model/geometry'
import { wallName, type Room } from '../model/types'

interface Props {
  room: Room
  selectedWall: number
  onSelectWall(i: number): void
}

/** План комнаты в SVG: стены кликабельны, проёмы отмечены цветом. */
export function PlanView({ room, selectedWall, onSelectWall }: Props) {
  const plan = buildPlan(room)
  const b = bounds(plan.points)
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY, 1000)
  const pad = size * 0.14
  const vb = `${b.minX - pad} ${b.minY - pad} ${b.maxX - b.minX + pad * 2} ${b.maxY - b.minY + pad * 2}`
  const sw = size / 90 // толщина линии стены
  const fs = size / 22 // размер шрифта

  return (
    <svg className="plan" viewBox={vb} preserveAspectRatio="xMidYMid meet">
      <polygon
        points={plan.points.map((p) => `${p.x},${p.y}`).join(' ')}
        className="plan__floor"
      />
      {room.walls.map((w, i) => {
        const a = plan.points[i]
        const c = plan.points[i + 1]
        const mid = alongWall(a, c, Math.hypot(c.x - a.x, c.y - a.y) / 2)
        const lx = mid.p.x - mid.n.x * fs * 0.9
        const ly = mid.p.y - mid.n.y * fs * 0.9
        // подпись вдоль стены, не вверх ногами
        let rot = (Math.atan2(mid.u.y, mid.u.x) * 180) / Math.PI
        if (rot > 90 || rot <= -90) rot += 180
        const sel = i === selectedWall
        return (
          <g key={w.id} onClick={() => onSelectWall(i)} className="plan__wall-g">
            <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} className="plan__hit" strokeWidth={sw * 6} />
            <line
              x1={a.x}
              y1={a.y}
              x2={c.x}
              y2={c.y}
              className={'plan__wall' + (sel ? ' plan__wall--sel' : '') + (w.length == null ? ' plan__wall--todo' : '')}
              strokeWidth={sw}
            />
            {room.openings
              .filter((o) => o.wallId === w.id && o.offset != null && o.width != null)
              .map((o) => {
                const s = alongWall(a, c, o.offset!).p
                const e = alongWall(a, c, o.offset! + o.width!).p
                return (
                  <line
                    key={o.id}
                    x1={s.x}
                    y1={s.y}
                    x2={e.x}
                    y2={e.y}
                    className={'plan__opening plan__opening--' + o.type}
                    strokeWidth={sw * 2.2}
                  />
                )
              })}
            <text x={lx} y={ly} fontSize={fs} transform={`rotate(${rot} ${lx} ${ly})`} className={'plan__label' + (sel ? ' plan__label--sel' : '')}>
              {wallName(i)} {w.length ?? '?'}
            </text>
          </g>
        )
      })}
      <circle cx={0} cy={0} r={sw * 1.6} className="plan__start" />
      {plan.complete && plan.closureGap > 20 && (
        <line
          x1={plan.points[plan.points.length - 1].x}
          y1={plan.points[plan.points.length - 1].y}
          x2={0}
          y2={0}
          className="plan__gap"
          strokeWidth={sw}
        />
      )}
    </svg>
  )
}
