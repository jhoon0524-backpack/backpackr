import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'
import { BTN_INK } from './ui'

export const dynamic = 'force-dynamic'

/**
 * 메뉴판.
 *
 * 제목을 한 줄로 줄이고 크기를 낮췄다. 두 줄짜리 거대 제목은 카드 한 판보다 큰 자리를 차지하면서
 * 정작 사람이 보러 온 것(메뉴 세 장)까지 내려가는 길을 늘렸다.
 * 세로 간격은 24 배수 한 벌 — 제목→설명 24, 설명→카드 56, 카드→권유 72.
 */
export default async function CommissionList() {
  const commissions = await listOpenCommissions()
  const openSlots = commissions.reduce((n, c) => n + Math.max(0, c.max_slots - c.active_count), 0)

  return (
    <div>
      {/*
        제목이 왼쪽 절반만 채우고 오른쪽이 비어 있었다. 남은 자리 수를 오른쪽 끝에 같은 밑선으로 두어
        가로를 채우고, 장식이 아니라 사러 온 사람이 가장 먼저 알고 싶은 숫자를 준다.
      */}
      {/*
        **주인공은 카드다.** 제목까지 크게 두면 화면에 소리치는 것이 셋이 되어 눈이 갈 곳을 잃는다.
        제목은 40px 로 물러나고, 오른쪽 끝에 지금 몇 자리가 남았는지를 같은 밑선에 둔다 —
        장식이 아니라 사러 온 사람이 가장 먼저 알고 싶은 숫자다.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h1 className="disp text-[34px] text-ink sm:text-[42px]">이번 달 받는 작업</h1>
        <p className="num disp shrink-0 text-[22px] leading-none text-ink">
          메뉴 {commissions.length}<span className="ml-0.5 text-[13px]">개</span>
          <span className="mx-2 text-[22px] font-normal text-line">·</span>
          <span className="text-accent">{openSlots}</span><span className="ml-0.5 text-[13px]">자리 남음</span>
        </p>
      </div>
      <p className="mt-3 mb-10 text-[15px] font-medium text-muted">
        창작자가 붙여 둔 메뉴판. 자리 있는 것부터 골라 보세요.
      </p>

      {commissions.length === 0 ? (
        <div className="border-[3px] border-ink bg-white p-10 text-center shadow-hard">
          <p className="disp text-3xl">아직 붙은 메뉴가 없어요.</p>
          <p className="mt-3 text-sm font-medium text-muted">창작자라면 첫 메뉴를 붙여 보세요.</p>
          <Link href="/open" className={BTN_INK + ' mt-8 !w-auto'}>메뉴 붙이기</Link>
        </div>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
        </ul>
      )}

      {/*
        노랑이 나오는 단 한 곳. **한 줄 띠로 낮춘다** — 아래에 큰 상자를 두면 화면에 주인공이 둘이 되고,
        정작 사러 온 사람의 눈이 창작자 모집 문구로 먼저 간다.
      */}
      <div className="mt-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-[3px] border-ink bg-yellow px-10 py-6">
        <p className="max-w-xl">
          <span className="disp block text-[24px] text-ink">그리는 분이세요?</span>
          <span className="mt-1 block text-[14px] font-medium text-ink">
            받고 싶은 작업 하나를 메뉴로 붙여 두면, 자리가 찰 때까지 의뢰가 들어와요.
          </span>
        </p>
        {/* 이 상자에서 눌러야 하는 것. 그림자를 갖는 것은 누를 수 있는 것뿐이다. */}
        <Link href="/open" className="disp inline-flex h-12 shrink-0 items-center border-[3px] border-ink bg-ink px-6 text-[17px] text-yellow shadow-hard transition active:translate-x-[2px] active:translate-y-[2px]">
          메뉴 붙이기
        </Link>
      </div>
    </div>
  )
}
