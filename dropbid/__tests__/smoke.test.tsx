import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'

// 도구 사슬(vitest + jsdom + React + TSX 변환)이 살아 있는지만 확인한다.
// 실제 화면 테스트는 해당 화면 작업에서 각자 추가한다.
test('테스트 러너가 컴포넌트를 렌더링한다', () => {
  render(<h1>Dropbid</h1>)
  expect(screen.getByRole('heading', { level: 1, name: 'Dropbid' })).toBeDefined()
})
