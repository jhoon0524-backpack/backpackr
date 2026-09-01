// @vitest-environment node
import { describe, expect, test, beforeAll } from 'vitest'

/**
 * 발견 8번의 재발 방지.
 *
 * uuid 꼴이 아닌 주소는 DB 까지 가지 않아야 한다. 가면 Postgres 가 22P02 를 던지고
 * 서버 오류 로그가 쌓인다. 주소는 아무나 칠 수 있으니 오류 대시보드가 이걸로 덮인다.
 *
 * "안 물어봤다" 를 어떻게 확인하나 — **닿을 수 없는 DB 를 가리켜 둔다.**
 * 질의가 나갔다면 접속 오류로 터진다. 조용히 null 이 오면 나가지 않은 것이다.
 */
let getAuction: (id: string) => Promise<unknown>

beforeAll(async () => {
  process.env.DATABASE_URL = 'postgresql://nobody:nobody@127.0.0.1:1/none'
  ;({ getAuction } = await import('@/lib/db'))
})

describe('경매 주소의 uuid 검사', () => {
  test('uuid 가 아닌 주소는 DB 에 묻지 않고 없음으로 답한다', async () => {
    for (const bad of ['not-a-uuid', '', '123', '../../etc/passwd', 'null', 'undefined',
                       '00000000-0000-0000-0000-00000000000', 'zzzzzzzz-0000-0000-0000-000000000000']) {
      await expect(getAuction(bad), bad).resolves.toBeNull()
    }
  })

  test('uuid 꼴이면 실제로 물어본다 (검사가 지나치게 막지 않는다)', async () => {
    // 닿을 수 없는 DB 를 가리켜 뒀으므로, 질의를 시도했다면 접속 오류로 터진다.
    await expect(getAuction('00000000-0000-0000-0000-000000000000')).rejects.toThrow()
  })
})
