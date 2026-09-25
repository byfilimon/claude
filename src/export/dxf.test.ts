import { describe, expect, it } from 'vitest'
import { encodeCp1251, roomToDxf } from './dxf'
import { newOpening, newRoom } from '../model/types'

describe('dxf', () => {
  it('содержит стены, проём и корректный конец файла', () => {
    const r = newRoom('Кухня', 4)
    ;[3000, 2500, 3000, 2500].forEach((l, i) => (r.walls[i].length = l))
    r.height = 2700
    r.openings.push({ ...newOpening(r.walls[0].id), offset: 500, width: 1200, height: 1400, elevation: 900 })
    const s = roomToDxf(r)
    expect(s).toContain('AC1009')
    expect(s.match(/\r\nLINE\r\n/g)!.length).toBe(4 + 3 + 4 * 4 + 4) // план + проём на плане + развёртки + проём
    expect(s.trimEnd().endsWith('EOF')).toBe(true)
  })
  it('кодирует кириллицу в cp1251', () => {
    expect(Array.from(encodeCp1251('Аяё'))).toEqual([0xc0, 0xff, 0xb8])
  })
})
