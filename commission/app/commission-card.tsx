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
export function SlotStamp({ left, max, size = 'sm' }: { left: number; max: number; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex items-center border-b-[3px] border-l-[3px] border-ink bg-white px-3 py-1.5 font-bold leading-none text-ink ${size === 'md' ? 'text-[15px]' : 'text-[13px]'}`}
      aria-label={`${max}자리 가운데 ${left}자리 비어 있음`}
    >
      자리 {left}/{max}
    </span>
  )
}

/** 마감. 자리 딱지와 같은 모양, 같은 자리. 색만 검정이다. */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-2 border-b-[3px] border-l-[3px] border-ink bg-ink px-3 py-1.5 font-bold leading-none text-white ${size === 'md' ? 'text-[15px]' : 'text-[13px]'}`}>
      {label}
    </span>
  )
}

/**
 * 사진이 아직 없는 자리.
 *
 * 한동안 여기에 사람 그림을 그려 넣었다. 그런데 그건 이 창작자의 작품이 아니라 **우리가 그린 남의 그림**이다.
 * 커미션 장터에서 카드 그림은 "이 사람 이렇게 그립니다" 라는 견본이고, 견본 자리에 우리 그림이 들어가면
 * 그건 견본이 아니라 채움이다. 보는 사람도 금방 안다.
 *
 * 그래서 없으면 없는 대로 둔다 — 대신 **제목을 크게 앉힌다.**
 * 메뉴판에서 사진이 없는 칸이 하는 일과 같다. 요리 이름을 큼직하게 쓰는 것.
 */
export function TitleField({ title, category, state, closed = false, big = false }: { title: string; category?: string; state?: string; closed?: boolean; big?: boolean }) {
  return (
    <div className={`flex h-full w-full items-start ${big ? 'bg-white p-8 pt-20' : 'px-4 pb-4 pt-5'}`}>
      {/*
        `break-keep` — 한글은 어절 단위로 끊어야 한다. 아무 데서나 끊으면 "로고·/타이틀" 처럼 가운뎃점이 줄 끝에 남는다.
        `text-balance` — 두 줄로 넘어갈 때 둘째 줄에 한 단어만 남지 않게 길이를 맞춘다.
        `min-h` — 제목 길이가 달라도 카드 셋의 값이 같은 밑선에 서게 한다.
      */}
      <span className={`flex w-full flex-col gap-1.5 ${big ? '' : 'min-h-[48px]'}`}>
        {/* 분류는 왼쪽, 자리 수는 오른쪽. 한 줄 안에서 "무엇" 과 "몇 자리" 가 나란히 읽힌다. */}
        {(category || state) && (
          <span className="flex items-baseline justify-between gap-3 text-[12px] font-bold leading-none tracking-[0.08em]">
            <span className={closed ? 'text-white/60' : 'text-strong'}>{category}</span>
            {state && <span className="num shrink-0">{state}</span>}
          </span>
        )}
        <span className={`text-balance break-keep leading-tight ${big ? 'disp text-[52px] text-ink' : 'line-clamp-2 text-[21px] font-bold'}`}>
          {title}
        </span>
      </span>
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
 * 메뉴 한 장.
 *
 * 위 칸은 **제목이 크게 앉는 색 면**이다 (창작자가 견본 이미지를 올려 두었다면 그 자리에 사진이 온다).
 * 아래 칸은 값과 사람. 제목을 두 번 쓰지 않는다 — 위에서 이미 가장 크게 말했다.
 *
 * 그림자는 **누를 수 있는 것**에만 있다. 카드는 링크라서 갖는다. 딱지와 번호표는 갖지 않는다.
 */
export function CommissionCard({ c }: { c: Card }) {
  const left = c.max_slots - c.active_count
  const closed = closedLabel(c.status, left)
  return (
    <Link
      href={`/commissions/${c.id}`}
      className={`group relative flex h-full flex-col border-[3px] border-ink transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard ${closed ? 'bg-ink text-white' : 'bg-white text-ink'}`}
    >
      <div className={`relative border-b ${closed ? 'border-white/50' : 'border-ink/25'} ${c.cover_url ? 'aspect-[16/10]' : ''}`}>
        <div className={c.cover_url ? 'absolute inset-0 overflow-hidden' : 'flex'}>
          {c.cover_url
            ? <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
            : <TitleField title={c.title} category={c.category} state={closed ?? `자리 ${left}/${c.max_slots}`} closed={!!closed} />}
          {closed && c.cover_url && <div className="absolute inset-0 bg-white/60" />}
        </div>
        {c.cover_url && <SlotOverlay active={c.active_count} max={c.max_slots} status={c.status} />}
       {/*
          기울여 붙인 것은 **마감 하나뿐**이다. 넷이 다 기울어 있으면 그건 붙인 자국이 아니라 무늬다.
          자리가 남았다는 말은 아래 값 줄 옆에 글자로 적는다.
        */}
       </div>

      <div className="body flex flex-1 items-end justify-between gap-3 p-4">
        {/* 만드는 사람과 걸리는 날. 값의 왼쪽에 두 줄로 앉는다 — 메뉴판의 이름 자리다. */}
        <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-tight">
          {c.creator_nickname}
          <span className={closed ? 'text-white/60' : 'text-muted'}> · {c.turnaround_days}일</span>
        </span>
        {/* 값. 끝을 맞춰 두면 넉 장의 값이 한 열로 읽힌다. */}
        <span className="disp num flex shrink-0 items-baseline text-[24px] leading-none">
          {/* 줄은 숫자에만 긋는다. 단위까지 함께 그으면 줄이 글자보다 길어져 지저분해진다. */}
          <span className={closed ? 'line-through decoration-[3px]' : ''}>{comma(c.price)}</span>
          <span className="ml-1 text-[14px]">원부터</span>
        </span>
      </div>

      {/*
        **노랑은 여기 하나다.** 이 화면에서 돈이 오가는 문은 카드뿐인데,
        그동안 노랑은 창작자 모집 띠에 가 있었다. 사러 온 사람이 눌러야 할 곳에 색이 없으면
        색 체계가 있어도 아무 일도 하지 않는 것이다.
      */}
      <span
        className={`disp flex items-center justify-between border-t px-4 py-3 text-[17px] ${
          closed ? 'border-white/50 text-white' : 'border-ink bg-yellow text-ink'
        }`}
      >
        {/* 도장이 이미 "마감" 이라고 말했다. 띠는 같은 말을 되풀이하지 않고 다음 할 일을 말한다. */}
        {closed ? '다음 자리가 나면 열려요' : '의뢰하기'}
      </span>
    </Link>
  )
}
