import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { comma } from '@/lib/format'

/**
 * 자리 딱지. **색이 뜻이다.**
 *   흰 바탕 = 지금 잡을 수 있는 자리
 *   검정 = 마감
 *
 * 노랑을 여기 쓰지 않는다. 이 화면에서 노랑은 제호의 분수 한 번뿐이고,
 * 같은 색이 세 군데로 흩어지면 그 한 번이 터지지 않는다.
 */
export function SlotStamp({ left, max, size = 'sm' }: { left: number; max: number; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`num inline-flex shrink-0 items-center whitespace-nowrap min-w-[92px] justify-center border-[2px] border-ink bg-white px-2.5 py-1 font-bold leading-none text-ink ${size === 'md' ? 'text-[15px]' : 'text-[14px]'}`}
      aria-label={`${max}자리 가운데 ${left}자리 비어 있음`}
    >
      빈자리 {left}/{max}
    </span>
  )
}

/** 마감. 자리 딱지와 같은 모양, 같은 자리. 칠만 검정이다. */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap min-w-[92px] justify-center border-[2px] border-ink bg-ink px-2.5 py-1 font-bold leading-none text-white ${size === 'md' ? 'text-[15px]' : 'text-[14px]'}`}>
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
export function CommissionCard({ c, n }: { c: Card; n: number }) {
  const left = c.max_slots - c.active_count
  const closed = closedLabel(c.status, left)
  return (
    <Link
      href={`/commissions/${c.id}`}
      className="block border-b border-ink py-8 transition hover:bg-yellow/25"
    >
      {/*
        한 줄은 하나의 밑선 위에 있다 — 번호, 이름, 점선, 값.
        칸을 나눠 두면 값 칸의 남는 왼쪽이 그대로 빈 곳이 되어 점선이 값에 닿지 못한다.
        점선은 닿아야 잇는 줄이다.
      */}
      <span className="flex items-baseline gap-4">
        {/* 번호는 제호와 같은 얼굴. 160px 다음에 바로 20px 가 오면 두 장의 서류를 붙여 둔 것처럼 읽힌다. */}
        <span className="poster w-[56px] shrink-0 text-[min(4.4vw,44px)] leading-none text-ink">
          {String(n).padStart(2, '0')}
        </span>
        <span className={`disp text-balance break-keep text-[min(3.2vw,30px)] leading-tight ${closed ? 'text-faint' : 'text-ink'}`}>
          {c.title}
        </span>
        <span aria-hidden className="leader hidden h-[1em] min-w-8 flex-1 text-line sm:block" />
        <span className="disp num ml-auto shrink-0 text-[min(3.2vw,30px)] leading-none text-ink sm:ml-0">
          <span className={closed ? 'line-through decoration-[2px]' : ''}>{comma(c.price)}</span>
          <span className="ml-1 inline-block w-[46px] text-left text-[14px]">원부터</span>
        </span>
      </span>

      <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-[72px]">
        <span className="text-[14px] font-bold text-strong">
          {c.category}
          <span className="text-muted"> · </span>
          {c.creator_nickname}
          <span className="font-medium text-muted"> · {c.turnaround_days}일 걸려요</span>
        </span>
        {closed ? <ClosedStamp label={closed} /> : <SlotStamp left={left} max={c.max_slots} />}
      </span>
    </Link>
  )
}
