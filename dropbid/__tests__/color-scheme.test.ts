import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 어두운 테마 기기에서 화면이 안 읽히던 것의 재발 방지.
 *
 * create-next-app 기본 globals.css 가 남아 있어서, 휴대폰을 어두운 테마로 쓰면
 * 배경이 #0a0a0a, 글자가 #ededed 가 됐다. 카드는 Tailwind 의 bg-white 라 흰색
 * 그대로여서 **흰 카드 위 흰 글자**가 됐다. 실제 기기에서 발견했다.
 *
 * "이걸 어긴 걸 어떻게 알지?" — 색 한 벌만 쓴다고 선언했는지 파일에서 확인한다.
 * 나중에 어두운 화면을 제대로 만들기로 정하면 이 검사를 그때 바꾼다.
 */
const raw = readFileSync(join(import.meta.dirname, '..', 'app', 'globals.css'), 'utf8')
// 주석에는 이 문제의 내력이 적혀 있다. 규칙이 아니라 설명이므로 검사에서 뺀다.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

describe('색 구성', () => {
  test('밝은 쪽만 쓴다고 선언한다', () => {
    // `only` 가 있어야 브라우저가 제멋대로 어둡게 뒤집지 않는다.
    expect(css).toMatch(/color-scheme:\s*only\s+light/)
  })

  test('색을 뒤집는 media 쿼리가 없다', () => {
    // 이게 다시 들어오면 흰 카드 위 흰 글자가 돌아온다.
    expect(css).not.toMatch(/prefers-color-scheme/)
  })

  test('레이어 밖에서 body 의 색·배경을 덮어쓰지 않는다', () => {
    // 레이어 밖 규칙은 Tailwind 유틸리티를 항상 이긴다.
    // 레이아웃에 적어 둔 bg-zinc-50 / text-zinc-900 이 무력해졌던 원인이다.
    const body = css.match(/body\s*\{[^}]*\}/)?.[0] ?? ''
    expect(body).not.toMatch(/(^|[^-])background\s*:/)
    expect(body).not.toMatch(/(^|[^-])color\s*:/)
  })

  test('정의되지 않은 글꼴 변수를 가리키지 않는다', () => {
    // --font-geist-sans 는 어디에도 정의된 적이 없어 본문이 Arial 로 떨어졌다.
    expect(css).not.toMatch(/var\(--font-geist/)
  })
})
