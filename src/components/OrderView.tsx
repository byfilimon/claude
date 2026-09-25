import { useState } from 'react'
import { downloadRoomDxf } from '../export/dxf'
import { newRoom, uid, type Order, type Room } from '../model/types'
import { RoomEditor } from './RoomEditor'

interface Props {
  order: Order
  onChange(o: Order): void
  onBack(): void
  onDelete(): void
}

const PRESETS: { name: string; make(): Room }[] = [
  { name: 'Прямоугольная', make: () => newRoom('Помещение', 4) },
  {
    name: 'Г-образная',
    make: () => {
      const r = newRoom('Помещение', 6)
      r.walls[2].angle = 270
      return r
    },
  },
]

export function OrderView({ order, onChange, onBack, onDelete }: Props) {
  const [roomId, setRoomId] = useState(order.rooms[0]?.id)
  const room = order.rooms.find((r) => r.id === roomId) ?? order.rooms[0]
  const set = (patch: Partial<Order>) => onChange({ ...order, ...patch })
  const setRoom = (r: Room) => set({ rooms: order.rooms.map((x) => (x.id === r.id ? r : x)) })

  const addRoom = (make: () => Room) => {
    const r = make()
    r.name = `Помещение ${order.rooms.length + 1}`
    set({ rooms: [...order.rooms, r] })
    setRoomId(r.id)
  }

  return (
    <div className="order">
      <div className="row">
        <button className="btn btn--ghost" onClick={onBack}>
          ← Заказы
        </button>
        <span className="grow" />
        <button
          className="btn btn--small btn--danger"
          onClick={() => confirm('Удалить заказ целиком?') && onDelete()}
        >
          Удалить заказ
        </button>
      </div>

      <div className="card order__client">
        <input className="text" placeholder="Клиент" value={order.client} onChange={(e) => set({ client: e.target.value })} />
        <input className="text" placeholder="Телефон" inputMode="tel" value={order.phone} onChange={(e) => set({ phone: e.target.value })} />
        <input className="text" placeholder="Адрес" value={order.address} onChange={(e) => set({ address: e.target.value })} />
      </div>

      <div className="tabs">
        {order.rooms.map((r) => (
          <button key={r.id} className={'tab' + (r.id === room?.id ? ' tab--active' : '')} onClick={() => setRoomId(r.id)}>
            {r.name || 'Без названия'}
          </button>
        ))}
        {PRESETS.map((p) => (
          <button key={p.name} className="tab tab--add" onClick={() => addRoom(p.make)}>
            + {p.name}
          </button>
        ))}
      </div>

      {room && (
        <>
          <div className="row">
            <input
              className="text grow"
              value={room.name}
              onChange={(e) => setRoom({ ...room, name: e.target.value })}
              placeholder="Название помещения"
            />
            <button className="btn btn--primary" onClick={() => downloadRoomDxf(order, room)}>
              DXF для Базиса
            </button>
            <button
              className="btn btn--small"
              onClick={() => {
                const copy = { ...structuredClone(room), id: uid(), name: room.name + ' (копия)' }
                set({ rooms: [...order.rooms, copy] })
                setRoomId(copy.id)
              }}
            >
              Копия
            </button>
            {order.rooms.length > 1 && (
              <button
                className="btn btn--small btn--danger"
                onClick={() => confirm(`Удалить «${room.name}»?`) && set({ rooms: order.rooms.filter((r) => r.id !== room.id) })}
              >
                ✕
              </button>
            )}
          </div>
          <RoomEditor key={room.id} room={room} onChange={setRoom} />
        </>
      )}
    </div>
  )
}
