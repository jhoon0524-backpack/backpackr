import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { comma } from '@/lib/format'
import { Photo } from './photo'

/**
 * 자리 딱지. **색이 뜻이다.**
 *   노랑 = 자리 있음 (이 서비스의 색)
 *   빨강 = 한 자리 남음 — 진짜로 급한 순간에만. 늘 빨강이면 급하다는 말이 들리지 않는다.
 *   검정 = 마감 (`ClosedStamp`)
 */
export function SlotStamp({ left, size = 'sm' }: { left: number; size?: 'sm' | 'md' }) {
  const last = left === 1
  return (
    <span className={`stamp disp ${last ? 'bg-accent text-white' : 'bg-yellow text-ink'} ${size === 'md' ? 'text-[22px]' : 'text-[17px]'}`}>
      {last ? '한 자리 남음' : `${left}자리 남음`}
    </span>
  )
}

/**
 * 못 받는 상태.
 *
 * 자리 딱지와 **같은 모양, 같은 자리**다. 색만 빨강에서 검정으로 바뀐다 —
 * 오른쪽 위 그 칸이 "이 메뉴의 자리 사정" 을 말하는 한 곳이고, 화면은 색으로만 답한다.
 * (그림 한가운데에 흰 상자를 띄웠더니 닫힘이 아니라 이미지가 깨진 것처럼 보였다.
 *  그림에서 색을 빼는 것도 같은 이유로 그만뒀다.)
 */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`stamp disp bg-ink text-white ${size === 'md' ? 'text-[22px]' : 'text-[17px]'}`}>
      {label}
    </span>
  )
}

/** 분류마다 바탕을 달리한다. 사진이 없을 때 세 칸이 똑같은 회색으로 서지 않게. */
const TINT: Record<string, string> = {
  '일러스트': '#f4efe6',
  '캐릭터 디자인': '#eef1e9',
  '로고·타이포': '#eceef4',
  '글·소설': '#f4eeee',
  '음악·사운드': '#eaf0f0',
  '기타': '#f2f2f2',
}

export function SamplePlaceholder({ category }: { category?: string }) {
  return <div className="hatch h-full w-full" style={{ ['--hatch-bg' as string]: TINT[category ?? ''] ?? '#f2f2f2' }} />
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
    <div className="absolute right-4 top-4">
      {label ? <ClosedStamp label={label} size={size} /> : <SlotStamp left={max - active} size={size} />}
    </div>
  )
}

/**
 * 메뉴 한 장. 카드만 3px 선과 6px 그림자를 갖는다 — 화면에서 집어 올릴 수 있는 유일한 물건이다.
 *
 * 딱지 자리는 **그림 안 오른쪽 위 16px** 한 곳뿐이다. 예전에는 사진과 글을 가르는 선에 걸터앉혔는데,
 * 카드마다 선까지의 거리가 달라 같은 부품이 카드마다 다른 관계를 갖는 것처럼 보였다.
 */
export function CommissionCard({ c, index }: { c: Card; index?: number }) {
  const left = c.max_slots - c.active_count
  const closed = closedLabel(c.status, left)
  return (
    <Link
      href={`/commissions/${c.id}`}
      className={`group relative flex h-full flex-col border-[3px] border-ink bg-white shadow-hard transition hover:-translate-x-1 hover:-translate-y-1 ${closed ? '[&_.card-body]:text-faint' : ''}`}
    >
      <div className="relative aspect-[16/10] border-b-[3px] border-ink">
        <div className="absolute inset-0 overflow-hidden">
          {c.cover_url
            ? <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
            : <SamplePlaceholder category={c.category} />}
          {/* 종이 한 겹. 그림은 그대로 두고 한 단 뒤로 물린다. */}
          {closed && <div className="absolute inset-0 bg-white/55" />}
        </div>
        {/* 자리 사정을 말하는 칸은 오른쪽 위 하나뿐이다. 빨강이면 남았고 검정이면 없다. */}
        <div className="absolute right-3 top-3 z-10">
          {closed ? <ClosedStamp label={closed} /> : <SlotStamp left={left} />}
        </div>
        {/*
          메뉴판의 번호. 게시판에 붙은 전단은 번호를 갖는다.
          선은 2px — 카드·버튼의 3px 보다 한 단 가늘게 둔다. 다 같은 굵기면 위계가 없다.
        */}
        {index !== undefined && (
          <span className="disp num absolute -left-[3px] -top-[3px] flex h-10 w-12 items-center justify-center border-[3px] border-ink bg-white pt-1 text-[20px] text-ink shadow-hard">
            {String(index).padStart(2, '0')}
          </span>
        )}
      </div>
      <div className={`card-body flex flex-1 flex-col p-4 ${closed ? 'bg-fill' : ''}`}>
        {/* 분류는 작은 꼬리표, 만드는 사람은 이름값. 둘을 같은 크기로 두면 어느 쪽이 이름인지 알 수 없다. */}
        <span className="truncate text-[11px] font-bold tracking-[0.1em] text-muted">{c.category}</span>
        <span className={`mt-1.5 line-clamp-2 text-[19px] font-extrabold leading-snug ${closed ? '' : 'text-ink'}`}>{c.title}</span>
        <span className={`mt-1.5 text-[13px] font-bold ${closed ? '' : 'text-strong'}`}>{c.creator_nickname}</span>
        {/*
          금액과 작업 기간은 같은 밑선에 선다. "원부터" 는 숫자와 **같은 글자체**로 두되 크기만 낮춘다 —
          다른 체로 두면 숫자에 붙은 오자처럼 보인다. 작업 기간은 검정 테두리 알약으로 묶어 회색 꼬리표에서 꺼낸다.
        */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-5">
          <span className={`disp num text-[34px] ${closed ? 'line-through' : 'text-ink'}`}>
            {comma(c.price)}<span className="disp ml-1 text-[15px]">원부터</span>
          </span>
          {/* 검정 칠. 번호표는 흰 바탕 + 테두리라 서로 다른 종류로 읽힌다. */}
          <span className={`num shrink-0 px-2 py-1 text-[12px] font-bold leading-none text-white ${closed ? 'bg-faint' : 'bg-ink'}`}>
            {c.turnaround_days}일
          </span>
        </div>
      </div>
    </Link>
  )
}
