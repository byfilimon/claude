import { useEffect, useState } from 'react'
import { RangefinderBar } from './components/RangefinderBar'
import { OrderList } from './components/OrderList'
import { OrderView } from './components/OrderView'
import { loadOrders, saveOrders } from './model/storage'
import { newOrder, type Order } from './model/types'

export function App() {
  const [orders, setOrders] = useState<Order[]>(loadOrders)
  const [openId, setOpenId] = useState<string | null>(null)
  useEffect(() => saveOrders(orders), [orders])

  const open = orders.find((o) => o.id === openId)

  return (
    <div className="app">
      <header className="app__header">
        <RangefinderBar />
      </header>
      <main className="app__main">
        {open ? (
          <OrderView
            order={open}
            onChange={(o) => setOrders((all) => all.map((x) => (x.id === o.id ? o : x)))}
            onBack={() => setOpenId(null)}
            onDelete={() => {
              setOrders((all) => all.filter((x) => x.id !== open.id))
              setOpenId(null)
            }}
          />
        ) : (
          <OrderList
            orders={orders}
            onOpen={setOpenId}
            onCreate={() => {
              const o = newOrder()
              setOrders((all) => [...all, o])
              setOpenId(o.id)
            }}
          />
        )}
      </main>
    </div>
  )
}
