import { describe, expect, test } from 'vitest'
import { daysLeft, kst, kstDate, rejectMessage, won } from '@/lib/format'

describe('format', () => {
  test('원화 표기', () => {
    expect(won(60000)).toBe('60,000원')
  })
  test('한국 시간, 오전/오후를 직접 조립', () => {
    expect(kst('2026-09-02T22:57:00Z')).toBe('2026년 9월 3일 오전 7:57')
    expect(kstDate('2026-09-02T22:57:00Z')).toBe('2026년 9월 3일')
  })
  test('남은 날은 한국 날짜 기준', () => {
    // UTC 로는 같은 날이지만 한국 시간으로는 하루 차이가 나는 경우
    expect(daysLeft('2026-09-02T16:00:00Z', new Date('2026-09-02T10:00:00Z'))).toBe(1)
    expect(daysLeft('2026-09-01T00:00:00Z', new Date('2026-09-03T00:00:00Z'))).toBe(-2)
  })
  test('모르는 거부 사유에도 문구가 있다', () => {
    expect(rejectMessage('slots_full')).toContain('자리')
    expect(rejectMessage('???')).toContain('다시 시도')
  })
})
