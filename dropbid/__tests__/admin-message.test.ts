import { describe, expect, test } from 'vitest'
import { adminErrorMessage, FALLBACK } from '@/lib/admin-message'

/**
 * 발견 2·3번의 재발 방지.
 * "이걸 어긴 걸 어떻게 알지?" — 이 파일이 답이다.
 */
describe('검수 화면 오류 문구', () => {
  test('DB 문장이 잘려 값만 남지 않는다', () => {
    // 전에는 첫 콜론 앞을 지워 화면에 "scheduled" 한 단어만 떴다.
    const msg = adminErrorMessage(new Error('검수 대기 상태가 아니다: scheduled'))
    expect(msg).not.toBe('scheduled')
    expect(msg).toContain('이미 처리된 상품입니다')
  })

  test('개발자용 반말이 그대로 나오지 않는다', () => {
    const msg = adminErrorMessage(new Error('반려 사유가 있어야 한다'))
    expect(msg).toBe('반려 사유를 입력해 주세요. 판매자에게 그대로 전달됩니다.')
  })

  test('아는 오류를 모두 한국어 안내로 바꾼다', () => {
    const cases = [
      '운영자만 검수할 수 있다',
      '없는 상품이다: 123',
      '검수 대기 중인 상품이 아니다: 123',
      '없는 회차다: 456',
      '이미 마감된 회차에는 배정할 수 없다',
    ]
    for (const raw of cases) {
      const msg = adminErrorMessage(new Error(raw))
      expect(msg, raw).not.toBe(FALLBACK)
      expect(msg, raw).toMatch(/(니다|주세요)\.$/)
    }
  })

  test('모르는 오류는 내용을 화면으로 흘리지 않는다', () => {
    const leaky = [
      new Error('duplicate key value violates unique constraint "products_pkey"'),
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
      new Error('permission denied for table products'),
      'DB 가 아닌 무언가',
    ]
    for (const e of leaky) {
      const msg = adminErrorMessage(e)
      expect(msg).toBe(FALLBACK)
      // 원문 조각이 한 글자도 섞이면 안 된다
      expect(msg).not.toMatch(/constraint|ECONNREFUSED|permission|5432/)
    }
  })

  test('화면 문구에 영어가 섞이지 않는다', () => {
    const all = [
      '운영자만 검수할 수 있다', '없는 상품이다: x', '검수 대기 상태가 아니다: scheduled',
      '없는 회차다: y', '이미 마감된 회차에는 배정할 수 없다', '반려 사유가 있어야 한다',
      '모르는 오류',
    ]
    for (const raw of all) expect(adminErrorMessage(new Error(raw)), raw).not.toMatch(/[A-Za-z]{3,}/)
  })
})
