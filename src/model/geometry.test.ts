import { describe, expect, it } from 'vitest'
import { areaM2, buildPlan, validateRoom } from './geometry'
import { newRoom } from './types'

const rect = (a: number, b: number) => {
  const r = newRoom('t', 4)
  ;[a, b, a, b].forEach((l, i) => (r.walls[i].length = l))
  return r
}

describe('geometry', () => {
  it('прямоугольник замыкается, площадь верная', () => {
    const p = buildPlan(rect(3000, 4000))
    expect(p.complete).toBe(true)
    expect(p.closureGap).toBeLessThan(1e-6)
    expect(areaM2(p.points)).toBeCloseTo(12)
  })
  it('Г-образная комната замыкается', () => {
    const r = newRoom('L', 6)
    ;[4000, 2000, 1500, 1000, 2500, 3000].forEach((l, i) => (r.walls[i].length = l))
    r.walls[2].angle = 270
    const p = buildPlan(r)
    expect(p.closureGap).toBeLessThan(1e-6)
    expect(areaM2(p.points)).toBeCloseTo(4 * 3 - 1.5 * 1)
  })
  it('незамкнутый контур даёт предупреждение', () => {
    const r = rect(3000, 4000)
    r.walls[2].length = 3100
    expect(validateRoom(r).join()).toMatch(/не замыкается/)
  })
})
