'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Item = { href: string; label: string }

/**
 * 지금 보고 있는 곳이 셋 중 어디인가.
 *
 * 자식 주소까지 부모 칸으로 친다. 전에는 `/` 만 `path === '/'` 로 봐서
 * 메뉴 상세·메뉴 고치기·의뢰 상세에서는 **세 칸이 모두 꺼져 있었다** —
 * 어디에 있는지 화면이 아무 말도 안 하는 상태였다 (검사표 A5, 실패 3).
 */
function isHere(href: string, path: string) {
  if (href === '/') return path === '/' || path.startsWith('/commissions')
  if (href === '/me') return path.startsWith('/me') || path.startsWith('/requests')
  return path.startsWith(href)
}

/**
 * 넓은 화면의 길. 지금 있는 칸만 흰색, 나머지는 흐린 흰색이다.
 *
 * 흐린 쪽을 `white/40` 으로 두었더니 검정 위에서 대비가 3.5 였다 (검사표 B1, 실패 4).
 * `white/60` 이면 7.2 — 여전히 현재 칸보다 물러나 있으면서 읽힌다.
 */
export function HeaderNav({ items }: { items: readonly Item[] }) {
  const path = usePathname()
  return (
    <nav className="disp hidden gap-8 text-[16px] sm:flex">
      {items.map((n) => {
        const here = isHere(n.href, path)
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={here ? 'page' : undefined}
            className="flex min-w-11 items-center justify-center py-5"
          >
            <span className={`flex items-center ${here ? 'text-white' : 'text-white/60 hover:text-white'}`}>
              {n.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * 좁은 화면의 길. 높이 44 탭 세 개.
 *
 * 전에는 세 칸이 모두 같은 흰 굵은 글자에 1px 선만 두고 **붙어 있었다** —
 * 어디에 있는지 알 수 없고(A5, 실패 2) 누르는 칸 사이 간격이 0 이었다(C2, 실패 11).
 * 지금 있는 칸은 노랑 바탕으로 칠하고, 칸 사이는 8px 를 띄운다.
 */
export function HeaderTabs({ items }: { items: readonly Item[] }) {
  const path = usePathname()
  return (
    <nav className="flex gap-2 border-t-[3px] border-white/20 px-3 py-2 sm:hidden">
      {items.map((n) => {
        const here = isHere(n.href, path)
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={here ? 'page' : undefined}
            className={`flex h-11 flex-1 items-center justify-center text-sm font-bold ${
              here ? 'bg-yellow text-ink' : 'text-white/75'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
