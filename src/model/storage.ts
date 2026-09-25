import type { Order } from './types'

// Черновой вариант: заказы хранятся в localStorage устройства.
// Дальше — синхронизация с сервером компании.
const KEY = 'zamer.orders.v1'

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

export function saveOrders(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders))
  } catch {
    /* хранилище недоступно — работаем в памяти */
  }
}
