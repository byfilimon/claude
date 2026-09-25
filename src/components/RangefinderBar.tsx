import { useState } from 'react'
import { useRangefinder } from '../ble/RangefinderContext'
import { bluetoothAvailable } from '../ble/glm'

/** Панель подключения рулетки: статус, последний замер, журнал пакетов. */
export function RangefinderBar() {
  const r = useRangefinder()
  const [showLog, setShowLog] = useState(false)
  return (
    <div className="rf">
      <div className="rf__row">
        <b className="app__title">Замер</b>
        <span className={'rf__dot rf__dot--' + r.status} />
        <span className="rf__name">
          {r.status === 'connected' ? r.deviceName : r.status === 'connecting' ? 'Подключение…' : 'Нет рулетки'}
        </span>
        {r.last != null && <span className="rf__last">{r.last} мм</span>}
        <span className="grow" />
        {r.status === 'connected' ? (
          <>
            {r.isSimulator && (
              <button className="btn btn--primary" onClick={r.simulate}>
                Замер
              </button>
            )}
            <button className="btn" onClick={r.disconnect}>
              Отключить
            </button>
          </>
        ) : (
          <>
            <button className="btn btn--primary" onClick={r.connectGlm} disabled={r.status === 'connecting'}>
              Bosch GLM
            </button>
            <button className="btn" onClick={r.connectSimulator} title="Проверка без прибора">
              Симулятор
            </button>
          </>
        )}
        <button className="btn btn--ghost" onClick={() => setShowLog((s) => !s)} title="Журнал Bluetooth">
          ≡
        </button>
      </div>
      {!bluetoothAvailable() && (
        <div className="rf__warn">
          Браузер без Bluetooth — вводите размеры вручную или откройте в Chrome на Android.
        </div>
      )}
      {r.error && <div className="rf__warn">{r.error}</div>}
      {showLog && <pre className="rf__log">{r.log.join('\n') || 'Журнал пуст'}</pre>}
    </div>
  )
}
