import { describe, expect, test } from 'vitest'
import { daysLeft, kst, kstDate, rejectMessage, trustFromFunding, won } from '@/lib/format'

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
  test('펀딩 이력이 없으면 아무것도 그리지 않는다 (없는 것을 말하지 않는다)', () => {
    expect(trustFromFunding({ backer_count: 0, satisfaction: null, satisfaction_count: 0 })).toBeNull()
  })
  test('만족도는 응답이 30명 이상일 때만 낸다', () => {
    const few = trustFromFunding({ backer_count: 340, satisfaction: 4.9, satisfaction_count: 12 })
    expect(few).toEqual({ backers: 340, satisfaction: null })
    const many = trustFromFunding({ backer_count: 1240, satisfaction: 4.8, satisfaction_count: 312 })
    expect(many).toEqual({ backers: 1240, satisfaction: 4.8 })
    // 경계값 — 딱 30명이면 낸다
    expect(trustFromFunding({ backer_count: 10, satisfaction: 4.0, satisfaction_count: 30 })?.satisfaction).toBe(4.0)
  })
  test('모르는 거부 사유에도 문구가 있다', () => {
    expect(rejectMessage('slots_full')).toContain('자리')
    expect(rejectMessage('???')).toContain('다시 시도')
  })
})
