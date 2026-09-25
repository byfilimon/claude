import { describe, expect, it } from 'vitest'
import { parseGlmPacket } from './glm'

const packet = (meters: number) => {
  const b = new DataView(new ArrayBuffer(20))
  ;[0xc0, 0x55, 0x10, 0x06].forEach((v, i) => b.setUint8(i, v))
  b.setFloat32(7, meters, true)
  return b
}

describe('parseGlmPacket', () => {
  it('читает расстояние в мм', () => expect(parseGlmPacket(packet(2.3456))).toBe(2346))
  it('игнорирует чужие пакеты', () => {
    const b = packet(1)
    b.setUint8(2, 0x02)
    expect(parseGlmPacket(b)).toBeNull()
  })
})
