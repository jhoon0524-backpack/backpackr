import Link from 'next/link'
import { BTN_SECONDARY } from './ui'

/** 없는 주소. 이 파일이 없으면 Next.js 기본 영어 404 가 한국어 레이아웃 안에 그대로 뜬다. */
export default function NotFound() {
  return (
    <div className="border-[3px] border-ink bg-white p-8 text-center">
      <p className="disp text-2xl text-ink">찾을 수 없는 페이지입니다.</p>
      <p className="mt-1.5 text-sm text-muted">주소가 잘못되었거나 없어진 페이지입니다.</p>
      <Link href="/" className={BTN_SECONDARY + ' mt-6 !w-auto'}>메뉴판으로</Link>
    </div>
  )
}
