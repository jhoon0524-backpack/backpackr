import Link from 'next/link'

/**
 * 없는 주소로 들어왔을 때.
 *
 * 이 파일이 없으면 Next.js 기본 화면("404 / This page could not be found.")이
 * 한국어 레이아웃 안에 영어로 그대로 뜬다. 링크가 만료됐거나 주소에 오타 하나만
 * 나도 사용자가 그 화면을 만난다 (QA 1회차 발견 1번).
 */
export default function NotFound() {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-5 py-14 text-center">
      <p className="text-base font-medium text-ink">찾을 수 없는 페이지입니다.</p>
      <p className="mt-2 text-sm text-muted">
        주소가 잘못되었거나, 창작자가 닫은 커미션일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-5 inline-block rounded bg-ash px-4 py-2 text-sm text-white"
      >
        커미션 목록으로
      </Link>
    </div>
  )
}
