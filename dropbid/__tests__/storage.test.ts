import { describe, expect, test, beforeEach, afterEach } from 'vitest'

/**
 * 업로드가 **올리기 전에** 막는지 본다.
 *
 * 크기·형식 검사는 스토리지에 붙기 전에 끝난다. 그래서 열쇠 없이도 검사할 수 있고,
 * 열쇠가 없다는 이유로 이 규칙이 검사되지 않는 상태로 남으면 안 된다.
 */
const ORIG = { ...process.env }
let mod: typeof import('@/lib/storage')

beforeEach(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  mod = await import('@/lib/storage')
})
afterEach(() => { process.env = { ...ORIG } })

const file = (name: string, type: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type })

describe('사진 업로드 검사', () => {
  test('5MB 를 넘으면 올리기 전에 막고, 어느 파일인지 알려 준다', async () => {
    const r = await mod.uploadImages([file('큰사진.jpg', 'image/jpeg', mod.MAX_BYTES + 1)], 'p/1')
    expect(r).toHaveProperty('error')
    if ('error' in r) {
      expect(r.error).toContain('큰사진.jpg')
      expect(r.error).toContain('5MB')
    }
  })

  test('이미지가 아니면 막는다', async () => {
    const r = await mod.uploadImages([file('문서.pdf', 'application/pdf', 100)], 'p/1')
    expect(r).toHaveProperty('error')
    if ('error' in r) expect(r.error).toContain('문서.pdf')
  })

  test('여러 장 중 하나만 잘못돼도 **아무것도 올리지 않는다**', async () => {
    // 앞의 것부터 올리다 중간에 멈추면 저장소에 주인 없는 파일이 남는다.
    const r = await mod.uploadImages(
      [file('a.jpg', 'image/jpeg', 10), file('b.exe', 'application/x-msdownload', 10)],
      'p/1',
    )
    expect(r).toHaveProperty('error')
  })

  test('막는 문구에 영어가 섞이지 않는다', async () => {
    const cases = [
      [file('x.jpg', 'image/jpeg', mod.MAX_BYTES + 1)],
      [file('x.pdf', 'application/pdf', 10)],
    ]
    for (const files of cases) {
      const r = await mod.uploadImages(files, 'p/1')
      if ('error' in r) {
        /*
          빼고 볼 것 두 가지 —
          - 파일명: 사용자가 준 것이다
          - 형식 이름(JPG·PNG·WEBP·HEIC): 한국어 화면에서도 이대로 쓴다.
            이걸 "영어" 로 잡으면 "제이피지" 같은 말을 쓰게 된다. 그게 더 나쁘다
        */
        const onlyMessage = r.error
          .replace(/"[^"]*"/g, '')
          .replace(/JPG|PNG|WEBP|HEIC|MB/g, '')
        expect(onlyMessage, r.error).not.toMatch(/[A-Za-z]{3,}/)
      }
    }
  })

  test('열쇠가 없으면 꺼진 것으로 본다 — 등록 자체를 막지 않는다', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const fresh = await import('@/lib/storage?fresh=' + Date.now())
    expect(fresh.isConfigured()).toBe(false)
  })
})
