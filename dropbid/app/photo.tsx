'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 상품 사진 한 장.
 *
 * 아직 업로드(Supabase Storage)가 없어서 판매자가 적어 넣은 주소를 그대로 그린다.
 * 주소가 이미지가 아니거나 죽어 있는 경우가 흔해서, 깨진 아이콘 대신 자리표시를 보여 준다.
 *
 * `onError` 만으로는 부족하다. 서버가 그린 HTML 을 브라우저가 읽는 동안 이미 실패해 버리면
 * React 가 붙기 전이라 핸들러가 못 받는다 (실제로 자리표시가 안 뜨는 것을 보고 알았다).
 * 붙은 직후에 이미 실패했는지 한 번 확인한다.
 * `referrerPolicy` 를 끄는 것은 어느 페이지를 보고 있는지가 남의 서버로 새 나가지 않게 하기 위한 것이다.
 */
export function Photo({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = ref.current
    // complete 인데 크기가 0 이면 이미 실패한 것이다.
    if (img?.complete && img.naturalWidth === 0) setBroken(true)
  }, [src])

  if (broken) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-[11px] text-zinc-400 ${className}`}
      >
        사진 없음
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={className}
    />
  )
}
