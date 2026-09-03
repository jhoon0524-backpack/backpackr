'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * 머리의 길. 지금 보고 있는 쪽에 밑줄을 둔다 —
 * 셋이 모두 같은 굵기면 어디에 있는지 화면이 말해 주지 않는다.
 *
 * 표시는 밑줄이 아니라 **검정 칠**이다. 화면의 다른 모든 것이 선과 면으로 말하는데
 * 여기만 가는 밑줄 하나면, 길은 이 판에 속하지 않은 것처럼 보인다.
 */
export function HeaderNav({ items }: { items: readonly { href: string; label: string }[] }) {
  const path = usePathname()
  return (
    <nav className="disp hidden gap-7 pb-[3px] text-[18px] sm:flex">
      {items.map((n) => {
        const here = n.href === '/' ? path === '/' : path.startsWith(n.href)
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={here ? 'page' : undefined}
            className="flex min-w-11 items-center justify-center py-5"
          >
            <span className={`flex items-center px-1 ${here ? 'border-b-2 border-yellow pb-0.5 text-white' : 'border-b-2 border-transparent pb-0.5 text-white/45 hover:text-white'}`}>
              {n.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
