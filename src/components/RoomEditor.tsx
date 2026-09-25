import { useState } from 'react'
import { useMeasurement } from '../ble/RangefinderContext'
import { areaM2, buildPlan, validateRoom } from '../model/geometry'
import { newOpening, OPENING_LABELS, uid, wallName, type Opening, type OpeningType, type Room } from '../model/types'
import { ElevationView } from './ElevationView'
import { NumField } from './NumField'
import { PlanView } from './PlanView'

type OpField = 'offset' | 'width' | 'height' | 'elevation'
type Target = { k: 'wall'; i: number } | { k: 'height' } | { k: 'op'; id: string; f: OpField } | null

const OP_FIELDS: { f: OpField; label: string }[] = [
  { f: 'offset', label: 'Отступ от угла' },
  { f: 'width', label: 'Ширина' },
  { f: 'height', label: 'Высота' },
  { f: 'elevation', label: 'От пола' },
]

interface Props {
  room: Room
  onChange(r: Room): void
}

export function RoomEditor({ room, onChange }: Props) {
  const [sel, setSel] = useState(0)
  const [target, setTarget] = useState<Target>({ k: 'wall', i: 0 })
  const wall = room.walls[Math.min(sel, room.walls.length - 1)]

  const setWall = (i: number, patch: Partial<Room['walls'][number]>) =>
    onChange({ ...room, walls: room.walls.map((w, j) => (j === i ? { ...w, ...patch } : w)) })
  const setOp = (id: string, patch: Partial<Opening>) =>
    onChange({ ...room, openings: room.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)) })

  const selectWall = (i: number) => {
    setSel(i)
    setTarget({ k: 'wall', i })
  }

  // Замер с рулетки попадает в активное поле, затем курсор переходит к следующему.
  useMeasurement((mm) => {
    if (!target) return
    if (target.k === 'wall') {
      setWall(target.i, { length: mm })
      if (target.i + 1 < room.walls.length) selectWall(target.i + 1)
      else setTarget(room.height == null ? { k: 'height' } : null)
    } else if (target.k === 'height') {
      onChange({ ...room, height: mm })
      setTarget(null)
    } else {
      setOp(target.id, { [target.f]: mm })
      const idx = OP_FIELDS.findIndex((x) => x.f === target.f)
      setTarget(idx + 1 < OP_FIELDS.length ? { k: 'op', id: target.id, f: OP_FIELDS[idx + 1].f } : null)
    }
  })

  const addWall = () => {
    const walls = [...room.walls]
    walls.splice(sel + 1, 0, { id: uid(), length: null, angle: 90 })
    onChange({ ...room, walls })
    selectWall(sel + 1)
  }
  const removeWall = () => {
    if (room.walls.length <= 3) return
    onChange({
      ...room,
      walls: room.walls.filter((_, j) => j !== sel),
      openings: room.openings.filter((o) => o.wallId !== wall.id),
    })
    selectWall(Math.max(0, sel - 1))
  }
  const fillRectangle = () => {
    if (room.walls.length !== 4) return
    const [a, b, c, d] = room.walls
    onChange({
      ...room,
      walls: [a, b, { ...c, length: c.length ?? a.length }, { ...d, length: d.length ?? b.length }].map((w) => ({
        ...w,
        angle: 90,
      })),
    })
  }
  const addOpening = (type: OpeningType) => {
    const o = newOpening(wall.id, type)
    onChange({ ...room, openings: [...room.openings, o] })
    setTarget({ k: 'op', id: o.id, f: 'offset' })
  }

  const plan = buildPlan(room)
  const issues = validateRoom(room)
  const wallOps = room.openings.filter((o) => o.wallId === wall.id)
  const isT = (t: Target) => JSON.stringify(t) === JSON.stringify(target)

  return (
    <div className="room">
      <div className="room__plan card">
        <PlanView room={room} selectedWall={sel} onSelectWall={selectWall} />
        <div className="room__stats">
          {plan.complete ? (
            <>
              Площадь ≈ {areaM2(plan.points).toFixed(2)} м² · Периметр{' '}
              {(room.walls.reduce((s, w) => s + (w.length ?? 0), 0) / 1000).toFixed(2)} м
            </>
          ) : (
            <>Замерено стен: {room.walls.filter((w) => w.length != null).length} из {room.walls.length}</>
          )}
        </div>
        {issues.map((s) => (
          <div key={s} className="warn">
            ⚠ {s}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="row">
          <h3 className="grow">Стены</h3>
          {room.walls.length === 4 && (
            <button className="btn btn--small" onClick={fillRectangle} title="C = A, D = B, все углы 90°">
              Прямоугольник
            </button>
          )}
        </div>
        <div className="walls">
          {room.walls.map((w, i) => (
            <NumField
              key={w.id}
              label={`Стена ${wallName(i)}`}
              value={w.length}
              onChange={(v) => setWall(i, { length: v })}
              active={isT({ k: 'wall', i })}
              onActivate={() => selectWall(i)}
            />
          ))}
          <NumField
            label="Высота потолка"
            value={room.height}
            onChange={(v) => onChange({ ...room, height: v })}
            active={isT({ k: 'height' })}
            onActivate={() => setTarget({ k: 'height' })}
          />
        </div>
        <p className="hint">
          Замеряйте стены по часовой стрелке от точки ●. Выделенное поле заполнится следующим замером с рулетки.
        </p>
      </div>

      <div className="card">
        <div className="row">
          <h3 className="grow">Стена {wallName(sel)}</h3>
          <button className="btn btn--small" onClick={addWall}>
            + стена после
          </button>
          <button className="btn btn--small btn--danger" onClick={removeWall} disabled={room.walls.length <= 3}>
            Удалить
          </button>
        </div>
        <label className="num">
          <span className="num__label">Угол с {wallName(sel + 1 === room.walls.length ? 0 : sel + 1)}</span>
          <select value={wall.angle} onChange={(e) => setWall(sel, { angle: Number(e.target.value) })}>
            {[90, 270, 135, 225, 120, 150].map((a) => (
              <option key={a} value={a}>
                {a}° {a === 90 ? '(внутренний)' : a === 270 ? '(выступ)' : ''}
              </option>
            ))}
          </select>
        </label>

        <ElevationView room={room} wall={wall} />

        {wallOps.map((o) => (
          <div key={o.id} className="op">
            <div className="row">
              <select value={o.type} onChange={(e) => setOp(o.id, { type: e.target.value as OpeningType })}>
                {Object.entries(OPENING_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <span className="grow" />
              <button
                className="btn btn--small btn--danger"
                onClick={() => onChange({ ...room, openings: room.openings.filter((x) => x.id !== o.id) })}
              >
                ✕
              </button>
            </div>
            <div className="op__fields">
              {OP_FIELDS.map(({ f, label }) => (
                <NumField
                  key={f}
                  label={label}
                  value={o[f]}
                  onChange={(v) => setOp(o.id, { [f]: v })}
                  active={isT({ k: 'op', id: o.id, f })}
                  onActivate={() => setTarget({ k: 'op', id: o.id, f })}
                />
              ))}
            </div>
            <input
              className="text"
              placeholder="Заметка"
              value={o.note}
              onChange={(e) => setOp(o.id, { note: e.target.value })}
            />
          </div>
        ))}
        <div className="chips">
          {(Object.keys(OPENING_LABELS) as OpeningType[]).map((t) => (
            <button key={t} className="btn btn--small" onClick={() => addOpening(t)}>
              + {OPENING_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Заметки по помещению</h3>
        <textarea
          className="text"
          rows={3}
          value={room.note}
          placeholder="Кривизна стен, материал, пожелания клиента…"
          onChange={(e) => onChange({ ...room, note: e.target.value })}
        />
      </div>
    </div>
  )
}
