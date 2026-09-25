import type { Order } from '../model/types'

interface Props {
  orders: Order[]
  onOpen(id: string): void
  onCreate(): void
}

export function OrderList({ orders, onOpen, onCreate }: Props) {
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="orders">
      <div className="row">
        <h2 className="grow">Заказы</h2>
        <button className="btn btn--primary" onClick={onCreate}>
          + Новый замер
        </button>
      </div>
      {sorted.length === 0 && <p className="hint">Пока нет замеров. Создайте первый.</p>}
      {sorted.map((o) => (
        <button key={o.id} className="card order-item" onClick={() => onOpen(o.id)}>
          <b>{o.client || 'Без имени'}</b>
          <span>{o.address || 'Адрес не указан'}</span>
          <small>
            {new Date(o.createdAt).toLocaleDateString('ru-RU')} · помещений: {o.rooms.length}
          </small>
        </button>
      ))}
    </div>
  )
}
