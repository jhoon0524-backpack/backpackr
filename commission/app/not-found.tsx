import Link from 'next/link'
import { BTN_SECONDARY } from './ui'

/** 없는 주소. 이 파일이 없으면 Next.js 기본 영어 404 가 한국어 레이아웃 안에 그대로 뜬다. */
export default function NotFound() {
  return (
    <div className="border-t border-ink py-16 text-center">
      <p className="serif text-xl font-bold text-ink">찾을 수 없는 페이지입니다.</p>
      <p className="mt-1.5 text-sm text-muted">주소가 잘못되었거나, 창작자가 닫은 커미션일 수 있습니다.</p>
      <Link href="/" className={BTN_SECONDARY + ' mt-6 !w-auto'}>커미션 둘러보기</Link>
    </div>
  )
}
