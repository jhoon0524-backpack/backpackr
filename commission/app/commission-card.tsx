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
  return (
    <span className={`disp inline-flex min-w-[92px] items-center justify-center border-[3px] border-ink bg-white px-3 py-1.5 leading-none text-ink ${size === 'md' ? 'text-[22px]' : 'text-[17px]'}`}>
      {left === 1 ? '한 자리 남음' : `${left}자리 남음`}
    </span>
  )
}

/** 마감. 자리 딱지와 같은 모양, 같은 자리. 색만 검정이다. */
export function ClosedStamp({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  return (
    <span className={`disp inline-flex min-w-[92px] items-center justify-center border-[3px] border-ink bg-accent px-3 py-1.5 leading-none text-white ${size === 'md' ? 'text-[22px]' : 'text-[17px]'}`}>
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
export function TitleField({ title, closed = false, big = false }: { title: string; closed?: boolean; big?: boolean }) {
  return (
    <div className={`flex h-full w-full items-start bg-white ${big ? 'p-8 pt-20' : 'px-4 pb-3 pt-9'}`}>
      {/*
        `break-keep` — 한글은 어절 단위로 끊어야 한다. 아무 데서나 끊으면 "로고·/타이틀" 처럼 가운뎃점이 줄 끝에 남는다.
        `text-balance` — 두 줄로 넘어갈 때 둘째 줄에 한 단어만 남지 않게 길이를 맞춘다.
        `min-h` — 제목 길이가 달라도 카드 셋의 값이 같은 밑선에 서게 한다.
      */}
      <span className={`line-clamp-3 text-balance break-keep font-bold leading-tight ${closed ? 'text-muted' : 'text-ink'} ${big ? 'disp text-[52px]' : 'min-h-[58px] text-[22px]'}`}>
        {title}
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
    <div className="absolute right-4 top-4">
      {label ? <ClosedStamp label={label} size={size} /> : <SlotStamp left={max - active} size={size} />}
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
      className={`group relative flex h-full flex-col border-[3px] border-ink bg-white ${closed ? '' : 'shadow-hard transition hover:-translate-x-1 hover:-translate-y-1'}`}
    >
      <div className={`relative border-b-[3px] border-ink ${c.cover_url ? 'aspect-[16/10]' : ''}`}>
        <div className={c.cover_url ? 'absolute inset-0 overflow-hidden' : 'flex'}>
          {c.cover_url
            ? <Photo src={c.cover_url} alt={c.title} className="h-full w-full object-cover" />
            : <TitleField title={c.title} closed={!!closed} />}
          {closed && c.cover_url && <div className="absolute inset-0 bg-white/60" />}
        </div>
        {/* 상태를 말하는 자리는 오른쪽 위 탭 하나. 노랑이면 자리가 있고 빨강이면 마감이다. */}
        <div className="absolute -right-2 -top-3 z-10 -rotate-[3deg]">
          {closed ? <ClosedStamp label={closed} /> : <SlotStamp left={left} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-end p-4">
        {/*
          **점선이 이름과 값을 잇는다.** 종이 메뉴판이 하는 그 일이다.
          앞 판에서는 점선이 이름 아래에 혼자 걸려 있었는데, 그건 잇는 줄이 아니라 그어 둔 선이라
          메뉴판 흉내만 내고 아무 일도 하지 않았다.
          값에 줄을 긋지 않는다 — 마감은 싸진 게 아니라 못 받는 것이다.
        */}
        <span className="flex items-baseline">
          <span className={`min-w-0 max-w-[6rem] shrink truncate text-[13px] font-bold ${closed ? 'text-muted' : 'text-strong'}`}>
            {c.creator_nickname}
          </span>
          <span className="leader min-w-4 flex-1 self-stretch text-line" />
          <span className={`poster num shrink-0 text-[27px] leading-none ${closed ? 'text-faint' : 'text-ink'}`}>
            {comma(c.price)}
          </span>
          <span className={`poster num shrink-0 text-[27px] leading-none ${closed ? 'text-faint' : 'text-ink'}`}>원~</span>
        </span>
        <span className={`mt-2 text-[13px] font-bold ${closed ? 'text-muted' : 'text-strong'}`}>
          {c.category} · 작업 {c.turnaround_days}일
        </span>
      </div>

      {/*
        **노랑은 여기 하나다.** 이 화면에서 돈이 오가는 문은 카드뿐인데,
        그동안 노랑은 창작자 모집 띠에 가 있었다. 사러 온 사람이 눌러야 할 곳에 색이 없으면
        색 체계가 있어도 아무 일도 하지 않는 것이다.
      */}
      <span
        className={`disp flex items-center justify-between border-t-[3px] border-ink px-4 py-3 text-[17px] ${
          closed ? 'bg-fill text-strong' : 'bg-yellow text-ink'
        }`}
      >
        {/* 도장이 이미 "마감" 이라고 말했다. 띠는 같은 말을 되풀이하지 않고 다음 할 일을 말한다. */}
        {closed ? '다음 자리가 나면 열려요' : '의뢰하기'}
        {!closed && <span aria-hidden className="text-[19px] leading-none">→</span>}
      </span>
    </Link>
  )
}
