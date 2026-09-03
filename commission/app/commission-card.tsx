import Link from 'next/link'
import type { CommissionCard as Card } from '@/lib/db'
import { comma } from '@/lib/format'
import { Photo } from './photo'

/** 자리가 남았을 때만 붙는 딱지. 빨강 하나뿐이고 그림자는 없다 — 카드에 얹힌 종이지 떠 있는 물체가 아니다. */
export function SlotStamp({ left, size = 'sm' }: { left: number; size?: 'sm' | 'md' }) {
  return (
    <span className={`stamp num bg-accent text-white ${size === 'md' ? 'text-[20px]' : 'text-[16px]'}`}>
      {left}자리 남음
    </span>
  )
}

/**
 * 못 받는 상태는 딱지가 아니라 **사진을 가로지르는 검정 띠**로 말한다.
 * 모서리에 네모 하나를 붙이고 글자만 바꾸면 "받는 중" 과 "끝난 것" 이 같은 무게로 읽힌다.
 * 품절 포스터가 그렇듯 모양과 검정 덩어리가 뜻을 나른다.
 */
export function ClosedBand({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/*
        각도를 −13° 까지 밀었다. −8° 는 붙인 것이 아니라 잘못 놓인 것처럼 보인다.
        글자는 흰색이 아니라 노랑이다 — 검정·노랑·빨강 세 색이 여기서 한 번 다 만난다.
        끝난 칸이 살아 있는 칸보다 조용하면 안 된다. 그건 위계가 뒤집힌 것이다.
      */}
      <span className="disp absolute left-1/2 top-[32%] w-[170%] -translate-x-1/2 -rotate-[13deg] border-y-[3px] border-ink bg-ink py-3 text-center text-[20px] tracking-wide text-yellow">
        {label}
      </span>
    </div>
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

/** 상세 화면이 사진 위에 자리 상태를 얹을 때. */
export function SlotOverlay({ active, max, status, size = 'sm' }: {
  active: number; max: number; status: string; size?: 'sm' | 'md'
}) {
  if (status === 'closed') return <ClosedBand label="내려 둔 메뉴" />
  const left = max - active
  if (left <= 0) return <ClosedBand label="이번 자리 마감" />
  return <div className="absolute right-3 top-3"><SlotStamp left={left} size={size} /></div>
}

/**
 * 메뉴 한 장. 카드만 3px 선과 12px 그림자를 갖는다 — 화면에서 집어 올릴 수 있는 유일한 물건이다.
 * 딱지는 테두리 안쪽에 둔다. 밖으로 걸치면 카드 그림자와 오른쪽 끝이 겹쳐 어디까지가 무엇인지 흐려진다.
 */
export function CommissionCard({ c }: { c: Card }) {
  const left = c.max_slots - c.active_count
  const closed = c.status === 'closed'
  return (
    <Link
      href={`/commissions/${c.id}`}
      className="group relative flex h-full flex-col border-[3px] border-ink bg-white shadow-hard transition hover:-translate-x-1 hover:-translate-y-1"
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b-[3px] border-ink">
        {c.cover_url
          ? <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
          : <SamplePlaceholder category={c.category} />}
        {closed && <ClosedBand label="내려 둔 메뉴" />}
        {!closed && left <= 0 && <ClosedBand label="이번 자리 마감" />}
        {!closed && left > 0 && (
          <div className="absolute right-3 top-3"><SlotStamp left={left} /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="truncate text-[11px] font-bold tracking-[0.08em] text-muted">
          {c.category} · {c.creator_nickname}
        </span>
        <span className="mt-2 line-clamp-2 text-[19px] font-bold leading-snug text-ink">{c.title}</span>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <span className="num disp text-[32px] tracking-tight text-ink">
            {comma(c.price)}<span className="ml-1 text-[17px]">원~</span>
          </span>
          {/* 숫자만 두면 쪽 번호처럼 읽힌다. 무엇의 며칠인지 밝힌다. */}
          <span className="num shrink-0 pb-1 text-[12px] font-bold text-muted">작업 {c.turnaround_days}일</span>
        </div>
      </div>
    </Link>
  )
}
