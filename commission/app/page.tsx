import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'

export const dynamic = 'force-dynamic'

const MONTH = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long' })

/**
 * 메뉴판.
 *
 * 두 가지가 이 화면을 지탱한다.
 *
 * 1. **크기 대비.** 검정 판 안에서 제목과 숫자가 서로 다른 크기로 부딪친다.
 *    큰 글자 하나만 왼쪽에 두고 오른쪽을 비우면, 그건 긴장이 아니라 그냥 빈 곳이다.
 *    남은 자리 수를 사람 키만 하게 세워 오른쪽을 채운다 — 장식이 아니라 사러 온 사람이 가장 먼저 볼 숫자다.
 *
 * 2. **권유는 띠가 아니라 빈 자리다.** 노랑 띠에 글 왼쪽·버튼 오른쪽은 어느 랜딩 페이지에나 있다.
 *    메뉴판에 어울리는 것은 **아직 아무도 안 붙인 빈 자리** 한 장이다. 카드와 같은 줄에 같은 크기로 선다.
 */
export default async function CommissionList() {
  const commissions = await listOpenCommissions()
  const openSlots = commissions.reduce((n, c) => n + Math.max(0, c.max_slots - c.active_count), 0)

  return (
    <div>
      {/* 머리와 이어 붙은 한 덩어리다. 위쪽 선을 없애 머리에서 그대로 흘러내리게 한다. */}
      <section className="relative left-1/2 -mx-[50vw] -mt-8 w-screen border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-[1100px] px-8 pb-11 pt-4">
          <div>
            <p className="num text-[12px] font-bold tracking-[0.16em] text-yellow">
              {MONTH.format(new Date())} <span className="text-white/40">/</span> 메뉴 {commissions.length}개
            </p>
            <h1 className="disp mt-5 whitespace-nowrap text-[min(11.4vw,116px)] text-white">
              이번 달 받는 작업
            </h1>
            <p className="mt-6 max-w-md text-[14px] font-medium leading-relaxed text-white/80">
              창작자가 받고 싶은 작업을 메뉴로 붙여 둡니다.
              지금 <span className="text-yellow">{openSlots}자리</span> 열려 있어요.
            </p>
          </div>
          {/*
            큰 숫자를 오른쪽에 세워 두었더니 화면에 크게 말하는 것이 둘이 되어 서로를 깎아먹었다.
            숫자는 제목 아래 한 줄로 물러난다 — 큰 것은 제목 하나뿐이다.
          */}
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <li className="sm:col-span-2 lg:col-span-3"><EmptySlot /></li>
        </ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {commissions.map((c, i) => (
            <li key={c.id}><CommissionCard c={c} index={i + 1} /></li>
          ))}
          <li className="sm:col-span-2 lg:col-span-3"><EmptySlot /></li>
        </ul>
      )}
    </div>
  )
}

/**
 * 아직 아무도 안 붙인 자리.
 * 카드 한 장 크기로 두었더니 줄 끝에 혼자 남아 커다란 빈 상자가 됐다 — 줄 전체를 차지하는 낮은 띠로 둔다.
 * 점선은 "여기는 비어 있다" 는 뜻이고, 굵기와 검정은 카드와 같다.
 *
 * **그림자가 없다.** 그림자는 "집어 올릴 수 있는 물건" 이라는 뜻인데, 아직 아무것도 안 붙은 자리는 물건이 아니다.
 * 점선 상자에 단단한 그림자를 달면 두 말이 서로를 부정한다.
 */
function EmptySlot() {
  return (
    <Link
      href="/open"
      className="group flex h-full items-center gap-5 border-[3px] border-dashed border-ink bg-white px-7 py-6 transition hover:bg-yellow"
    >
      <span className="disp flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-ink bg-yellow text-[32px] leading-none text-ink shadow-hard transition group-hover:bg-white">+</span>
      <span>
        <span className="disp block text-[20px] text-ink">여기 붙이기</span>
        <span className="mt-1 block text-[13px] font-medium leading-relaxed text-muted">
          그리는 분이라면 받고 싶은 작업 하나를 메뉴로 붙여 두세요. 자리가 찰 때까지 의뢰가 들어와요.
        </span>
      </span>
    </Link>
  )
}
