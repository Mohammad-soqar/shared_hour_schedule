import { afterEach, describe, expect, test, vi } from 'vitest'
import { requireEnv } from './env'

describe('requireEnv', () => {
  afterEach(() => vi.unstubAllEnvs())
  test('returns the value when set', () => {
    vi.stubEnv('MY_TEST_VAR', 'abc')
    expect(requireEnv('MY_TEST_VAR')).toBe('abc')
  })
  test('throws with the var name when missing', () => {
    vi.stubEnv('MY_TEST_VAR', '')
    expect(() => requireEnv('MY_TEST_VAR')).toThrow('MY_TEST_VAR')
  })
})
