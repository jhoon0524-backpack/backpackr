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
      className={`num inline-flex shrink-0 items-center whitespace-nowrap bg-yellow px-2.5 py-1.5 font-bold leading-none text-ink ${size === 'md' ? 'text-[15px]' : 'text-[14px]'}`}
      aria-label={`${max}자리 가운데 ${left}자리 비어 있음`}
    >
      빈자리 {left}/{max}
    </span>
  )
}

/** 마감. 자리 딱지와 같은 모양, 같은 자리. 칠만 검정이다. */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap bg-ink px-2.5 py-1.5 font-bold leading-none text-white ${size === 'md' ? 'text-[15px]' : 'text-[14px]'}`}>
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
      className={`grid grid-cols-12 gap-x-4 gap-y-2 border-b border-ink py-6 transition hover:bg-yellow/25 ${closed ? 'opacity-45' : ''}`}
    >
      {/*
        번호는 제호와 같은 얼굴이다. 160px 로 소리친 다음 바로 20px 로 속삭이면 두 장의 서류를 붙여 둔 것처럼
        읽힌다. 그 사이를 잇는 계단이 이 번호다.
      */}
      <span className="poster col-span-2 text-[min(4.4vw,44px)] leading-none text-ink lg:col-span-1">
        {String(n).padStart(2, '0')}
      </span>

      {/*
        메뉴판의 한 줄 — 이름 바로 뒤에서 점이 시작해 값 칸 앞에서 멈춘다.
        점의 시작까지 칸에 묶어 두면 이름과 점 사이가 툭 벌어져, 잇는 줄이 아니라 따로 놓인 조각이 된다.
      */}
      <span className="col-span-10 flex items-baseline gap-4 lg:col-span-8">
        <span className="disp text-balance break-keep text-[min(3.2vw,30px)] leading-tight text-ink">
          {c.title}
        </span>
        <span aria-hidden className="leader hidden h-[1em] min-w-8 flex-1 self-baseline text-line lg:block" />
      </span>

      {/* 값은 두 칸짜리 표다 — 숫자는 오른쪽에, 단위는 고정폭 왼쪽에. 자릿수가 달라도 자리가 안 흔들린다. */}
      <span className="col-span-12 grid grid-cols-[1fr_46px] items-baseline lg:col-span-3">
        <span className="disp num text-right text-[min(3.2vw,30px)] leading-none text-ink">{comma(c.price)}</span>
        <span className="disp pl-1 text-[15px] leading-none text-ink">원부터</span>
      </span>

      <span className="col-span-12 flex flex-wrap items-center gap-x-3 gap-y-2 lg:col-span-8 lg:col-start-2">
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
