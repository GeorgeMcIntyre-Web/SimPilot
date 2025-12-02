import { describe, it, expect } from 'vitest'

describe('sanity check', () => {
  it('basic math works', () => {
    expect(1 + 1).toBe(2)
  })

  it('string concatenation works', () => {
    expect('hello' + ' ' + 'world').toBe('hello world')
  })
})
