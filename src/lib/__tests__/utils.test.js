import { describe, it, expect } from 'vitest'
import { formatRupiah } from '../utils'

describe('formatRupiah', () => {
  it('formats zero correctly', () => {
    const result = formatRupiah(0)
    // Node ICU may insert a space between symbol and number
    expect(result).toMatch(/Rp\s?0/)
  })

  it('formats small amounts correctly', () => {
    const result = formatRupiah(5000)
    expect(result).toContain('5.000')
  })

  it('formats large amounts correctly', () => {
    const result = formatRupiah(1500000)
    expect(result).toContain('1.500.000')
  })

  it('formats negative amounts', () => {
    const result = formatRupiah(-25000)
    expect(result).toContain('25.000')
  })

  it('handles decimal values', () => {
    const result = formatRupiah(50000.75)
    // minimumFractionDigits: 0, but existing decimals may still render
    expect(result).toMatch(/50\.000/)
  })
})
