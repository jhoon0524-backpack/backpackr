import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { comma } from '@/lib/format'

/**
 * 자리 딱지. **색이 뜻이다.**
 *   노랑 = 지금 잡을 수 있는 자리
 *   검정 = 마감
 */
export function SlotStamp({ left, max, size = 'sm' }: { left: number; max: number; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`num inline-flex shrink-0 items-center whitespace-nowrap bg-yellow px-3 py-1.5 font-bold leading-none text-ink ${size === 'md' ? 'text-[15px]' : 'text-[13px]'}`}
      aria-label={`${max}자리 가운데 ${left}자리 비어 있음`}
    >
      빈자리 {left}/{max}
    </span>
  )
}

/** 마감. 자리 딱지와 같은 모양, 같은 자리. 칠만 검정이다. */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap bg-ink px-3 py-1.5 font-bold leading-none text-white ${size === 'md' ? 'text-[15px]' : 'text-[13px]'}`}>
      {label}
    </span>
  )
}

/**
 * 사진이 아직 없는 자리 — 상세 화면에서만 쓴다.
 *
 * 한동안 목록의 카드 그림 자리에 사람 그림을 그려 넣었다. 그런데 그건 이 창작자의 작품이 아니라
 * **우리가 그린 남의 그림**이다. 견본 자리에 우리 그림이 들어가면 그건 견본이 아니라 채움이다.
 * 그래서 없으면 없는 대로 두고, 대신 제목을 크게 앉힌다.
 */
export function TitleField({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-start bg-white p-8 pt-20">
      {/* `break-keep` — 한글은 어절 단위로 끊는다. `text-balance` — 둘째 줄에 한 단어만 남지 않게. */}
      <span className="disp text-balance break-keep text-[52px] leading-tight text-ink">{title}</span>
    </div>
  )
}

/** 못 받는 상태의 이름. 목록과 상세가 같은 말을 쓰게 한 곳에 둔다. */
export function closedLabel(status: string, left: number) {
  if (status === 'closed') return '내려 둔 메뉴'
  return left <= 0 ? '마감' : null
}

/** 상세 화면이 사진 위에 자리 상태를 얹을 때. */
export function SlotOverlay({ active, max, status, size = 'sm' }: {
  active: number; max: number; status: string; size?: 'sm' | 'md'
}) {
  const label = closedLabel(status, max - active)
  return (
    <div className="absolute right-0 top-0 z-10">
      {label ? <ClosedStamp label={label} size={size} /> : <SlotStamp left={max - active} max={max} size={size} />}
    </div>
  )
}

/**
 * 메뉴 한 줄.
 *
 * 한동안 이걸 카드 석 장으로 늘어놓았다. 그런데 테두리 두른 상자 셋을 나란히 두는 건
 * **요금제 표**의 생김새다. 이 서비스가 내세운 말은 메뉴판인데, 메뉴판은 상자가 아니라 **줄**이다 —
 * 왼쪽에 이름, 오른쪽에 값, 그 사이를 잇는 굵은 줄 하나.
 *
 * 그래서 장부로 짠다. 한 줄이 곧 한 메뉴이고, 줄 끝의 딱지 색이 상태다.
 * 노랑이면 지금 잡을 수 있고, 검정이면 마감이다.
 */
export function CommissionCard({ c }: { c: Card }) {
  const left = c.max_slots - c.active_count
  const closed = closedLabel(c.status, left)
  return (
    <Link
      href={`/commissions/${c.id}`}
      className="grid grid-cols-12 items-end gap-x-4 gap-y-3 border-b-[3px] border-ink py-6 transition hover:bg-yellow/25"
    >
      <span className="col-span-12 lg:col-span-5">
        <span className="block text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-muted">
          {c.category}
        </span>
        {/* 메뉴판에서 가장 큰 글자는 요리 이름이다. */}
        <span className="disp mt-2 block text-balance break-keep text-[min(3.2vw,30px)] leading-tight text-ink">
          {c.title}
        </span>
      </span>

      <span className="col-span-6 text-[14px] font-bold leading-tight text-ink lg:col-span-3">
        {c.creator_nickname}
        <span className="block font-medium text-muted">{c.turnaround_days}일 걸려요</span>
      </span>

      {/* 값은 끝을 맞춘다. 자릿수가 달라도 줄마다 값의 끝이 같은 자리에 선다. */}
      <span className="disp num col-span-6 flex items-baseline justify-end text-[min(3.2vw,30px)] leading-none text-ink lg:col-span-2">
        {comma(c.price)}
        <span className="ml-1 w-[42px] shrink-0 text-left text-[14px]">원부터</span>
      </span>

      <span className="col-span-12 flex lg:col-span-2 lg:justify-end">
        {closed ? <ClosedStamp label={closed} /> : <SlotStamp left={left} max={c.max_slots} />}
      </span>
    </Link>
  )
}
