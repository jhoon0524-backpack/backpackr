import { describe, expect, test } from 'vitest'
import { normalizePhone } from '@/lib/phone'

describe('휴대폰 번호 정리', () => {
  test('여러 꼴로 넣어도 한 가지로 저장한다', () => {
    for (const raw of ['01055556666', '010-5555-6666', '010 5555 6666', ' 010.5555.6666 ']) {
      expect(normalizePhone(raw)).toBe('010-5555-6666')
    }
  })

  test('010 외 통신사 번호도 받는다', () => {
    expect(normalizePhone('01112345678')).toBe('011-1234-5678')
    expect(normalizePhone('0111234567')).toBe('011-123-4567')
  })

  test('휴대폰이 아니면 저장하지 않는다', () => {
    // 빈 값이 통과하면 place_bid 의 연락처 차단(`phone is not null`)에 구멍이 난다.
    for (const raw of ['', '   ', '1234', '02-123-4567', '010-1234-567890', 'abc', '0101234']) {
      expect(normalizePhone(raw)).toBeNull()
    }
  })
})
