import { OPENING_LABELS, type Room, type Wall } from '../model/types'

/** Развёртка одной стены: вид спереди с проёмами. */
export function ElevationView({ room, wall }: { room: Room; wall: Wall }) {
  const L = wall.length ?? 1000
  const H = room.height ?? 2700
  const pad = Math.max(L, H) * 0.06
  const fs = Math.max(L, H) / 28
  const ops = room.openings.filter((o) => o.wallId === wall.id && o.offset != null && o.width != null)
  return (
    <svg className="elev" viewBox={`${-pad} ${-pad} ${L + pad * 2} ${H + pad * 2}`}>
      <rect x={0} y={0} width={L} height={H} className="elev__wall" strokeWidth={fs / 6} />
      {ops.map((o) => {
        const h = o.height ?? fs
        const y = H - (o.elevation ?? 0) - h
        return (
          <g key={o.id}>
            <rect
              x={o.offset!}
              y={y}
              width={o.width!}
              height={h}
              className={'elev__op plan__opening--' + o.type}
              strokeWidth={fs / 8}
            />
            <text x={o.offset! + o.width! / 2} y={y + h / 2} fontSize={fs * 0.8} className="elev__text">
              {OPENING_LABELS[o.type]}
            </text>
          </g>
        )
      })}
      <text x={L / 2} y={H - fs * 0.6} fontSize={fs} className="elev__text">
        {wall.length ?? '?'} × {room.height ?? '?'}
      </text>
    </svg>
  )
}
