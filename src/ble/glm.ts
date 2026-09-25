/**
 * Драйвер Bosch GLM 50 C (и родственных GLM 50-27 C/CG, GLM 100 C по BLE).
 *
 * Протокол Bosch официально не публикует. Значения ниже взяты из открытых
 * реверс-инжиниринговых проектов и требуют проверки на реальном приборе —
 * для этого в приложении есть журнал «сырых» пакетов (hex).
 */

export const GLM_SERVICE = '02a6c0d0-0451-4000-b000-fb3210111989'
export const GLM_CHAR = '02a6c0d1-0451-4000-b000-fb3210111989'

/** Команда включения автосинхронизации: после неё каждый замер приходит уведомлением. */
export const CMD_AUTOSYNC = new Uint8Array([0xc0, 0x55, 0x02, 0x01, 0x00, 0x1a])

export const toHex = (b: DataView | Uint8Array) => {
  const u8 = b instanceof Uint8Array ? b : new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
  return Array.from(u8, (x) => x.toString(16).padStart(2, '0')).join(' ')
}

/**
 * Разбирает пакет замера. Формат: C0 55 10 <mode> ... <float32 LE, метры с 7-го байта> ...
 * Возвращает миллиметры или null, если пакет — не замер.
 */
export function parseGlmPacket(dv: DataView): number | null {
  if (dv.byteLength < 11) return null
  if (dv.getUint8(0) !== 0xc0 || dv.getUint8(1) !== 0x55 || dv.getUint8(2) !== 0x10) return null
  const meters = dv.getFloat32(7, true)
  if (!Number.isFinite(meters) || meters <= 0 || meters > 250) return null
  return Math.round(meters * 1000)
}

export interface Rangefinder {
  readonly name: string
  connect(): Promise<void>
  disconnect(): void
}

export interface RangefinderEvents {
  onMeasurement: (mm: number) => void
  onLog: (line: string) => void
  onDisconnect: () => void
}

export const bluetoothAvailable = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator

export class GlmRangefinder implements Rangefinder {
  name = 'Bosch GLM'
  private device?: BluetoothDevice
  private char?: BluetoothRemoteGATTCharacteristic

  constructor(private ev: RangefinderEvents) {}

  async connect() {
    if (!bluetoothAvailable()) {
      throw new Error('Браузер не поддерживает Web Bluetooth. Откройте в Chrome на Android/ПК или в Bluefy на iPhone.')
    }
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'GLM' }, { services: [GLM_SERVICE] }],
      optionalServices: [GLM_SERVICE],
    })
    this.name = this.device.name ?? 'Bosch GLM'
    this.device.addEventListener('gattserverdisconnected', () => {
      this.ev.onLog('Отключено')
      this.ev.onDisconnect()
    })
    this.ev.onLog(`Подключение к ${this.name}…`)
    const server = await this.device.gatt!.connect()
    const service = await server.getPrimaryService(GLM_SERVICE)
    this.char = await service.getCharacteristic(GLM_CHAR)
    this.char.addEventListener('characteristicvaluechanged', this.handle)
    await this.char.startNotifications()
    await this.char.writeValue(CMD_AUTOSYNC)
    this.ev.onLog('Готово. Нажмите кнопку замера на рулетке.')
  }

  private handle = (e: Event) => {
    const dv = (e.target as BluetoothRemoteGATTCharacteristic).value
    if (!dv) return
    this.ev.onLog(`← ${toHex(dv)}`)
    const mm = parseGlmPacket(dv)
    if (mm != null) this.ev.onMeasurement(mm)
  }

  disconnect() {
    this.char?.removeEventListener('characteristicvaluechanged', this.handle)
    this.device?.gatt?.disconnect()
  }
}

/** Имитация рулетки — для проверки интерфейса без прибора. */
export class SimulatedRangefinder implements Rangefinder {
  name = 'Симулятор'
  constructor(private ev: RangefinderEvents) {}
  async connect() {
    this.ev.onLog('Симулятор подключён: кнопка «Замер» выдаёт случайное значение.')
  }
  measure() {
    const mm = Math.round(600 + Math.random() * 3400)
    this.ev.onLog(`sim ← ${mm} мм`)
    this.ev.onMeasurement(mm)
  }
  disconnect() {
    this.ev.onDisconnect()
  }
}
