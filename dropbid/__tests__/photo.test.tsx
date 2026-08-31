import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { Photo } from '@/app/photo'

afterEach(cleanup)

test('주소가 죽어 있으면 깨진 아이콘 대신 자리표시를 보여 준다', () => {
  render(<Photo src="https://없는곳/1.jpg" alt="상품 사진" />)
  fireEvent.error(screen.getByAltText('상품 사진'))
  expect(screen.getByText('사진 없음')).toBeDefined()
  expect(screen.queryByAltText('상품 사진')).toBeNull()
})

test('남의 서버로 어느 페이지를 보는지 새 나가지 않게 한다', () => {
  render(<Photo src="https://남의서버/1.jpg" alt="상품 사진" />)
  expect(screen.getByAltText('상품 사진').getAttribute('referrerPolicy')).toBe('no-referrer')
})
