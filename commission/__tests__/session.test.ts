import { describe, expect, test } from 'vitest'
import { demoLoginEnabled } from '@/lib/session'

/**
 * 시연용 로그인은 쿠키 하나로 아무나 남이 될 수 있는 장치다.
 * 그래서 **켜지는 조건을 테스트로 못박는다.** 나중에 누가 기본값을 뒤집으면 여기서 걸린다.
 */
describe('시연용 로그인은 배포에서 기본으로 잠긴다', () => {
  test('배포(production)에서는 아무 말이 없으면 꺼짐', () => {
    expect(demoLoginEnabled({ NODE_ENV: 'production' })).toBe(false)
  })

  test('배포에서 켜려면 DEMO_LOGIN=on 이라고 분명히 적어야 한다', () => {
    expect(demoLoginEnabled({ NODE_ENV: 'production', DEMO_LOGIN: 'on' })).toBe(true)
  })

  test('로컬 개발에서는 켜져 있다 — 안 그러면 아무 화면도 못 본다', () => {
    expect(demoLoginEnabled({ NODE_ENV: 'development' })).toBe(true)
    expect(demoLoginEnabled({})).toBe(true)
  })

  test('로컬에서도 off 라고 적으면 잠긴다', () => {
    expect(demoLoginEnabled({ NODE_ENV: 'development', DEMO_LOGIN: 'off' })).toBe(false)
  })

  test('"true"·"1"·"ON" 같은 비슷한 말로는 안 열린다 — 켜는 말은 하나뿐이다', () => {
    for (const v of ['true', '1', 'ON', 'yes', 'On', '']) {
      expect(demoLoginEnabled({ NODE_ENV: 'production', DEMO_LOGIN: v })).toBe(false)
    }
  })
})
