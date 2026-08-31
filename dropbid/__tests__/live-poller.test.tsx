import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { LivePoller } from '@/app/auctions/[id]/live-poller'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const NOW = new Date('2026-09-01T00:00:00Z')

beforeEach(() => {
  refresh.mockClear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** 마감까지 `seconds` 남은 경매 화면을 띄운다. */
function mount(seconds: number) {
  const endsAt = new Date(NOW.getTime() + seconds * 1000).toISOString()
  render(<LivePoller endsAt={endsAt} serverNow={NOW.toISOString()} />)
}

test('여유가 있으면 7초 간격으로 본다', async () => {
  mount(600)
  await vi.advanceTimersByTimeAsync(6_000)
  expect(refresh).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(2_000)
  expect(refresh).toHaveBeenCalledTimes(1)
})

test('마감 1분 안에는 2초 간격으로 본다 — 30초 연장이 걸리는 구간이다', async () => {
  mount(50)
  await vi.advanceTimersByTimeAsync(20_000)
  // 2초 간격이면 10번 안팎. 7초 간격(3번 이하)과 확실히 갈린다.
  expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(8)
})

test('마감이 지나면 더 보지 않는다', async () => {
  mount(-10)
  await vi.advanceTimersByTimeAsync(30_000)
  // 마감 직후 상태를 받아 오려고 한 번은 부른다. 그 뒤로는 멈춘다.
  expect(refresh.mock.calls.length).toBeLessThanOrEqual(1)
})

test('화면을 떠나면 타이머가 남지 않는다', async () => {
  mount(600)
  cleanup()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(refresh).not.toHaveBeenCalled()
})
