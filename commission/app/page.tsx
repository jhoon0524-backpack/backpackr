import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'

export const dynamic = 'force-dynamic'

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
  const allSlots = commissions.reduce((n, c) => n + c.max_slots, 0)

  return (
    <div>
      {/* 머리와 이어 붙은 한 덩어리다. 위쪽 선을 없애 머리에서 그대로 흘러내리게 한다. */}
      <section className="relative left-1/2 -mx-[50vw] w-screen border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-[1200px] px-8 pb-10 pt-6">
          {/*
            제호는 판 폭에 꼭 맞게 짠다. 밑선도 설명도 판 안에 있는데 제호만 밖으로 나가면
            그건 판형이 아니라 사고로 읽힌다.
          */}
          <h1 className="poster flex flex-nowrap items-baseline gap-[0.1em] whitespace-nowrap text-[min(11.2vw,161px)] leading-[0.9] tracking-[0.015em] text-white">
            <span>자리</span>
            <Fraction open={openSlots} all={allSlots} />
            <span>남았어요</span>
          </h1>
          {/* 판의 밑선. 제호가 소리치고, 이 줄이 무슨 뜻인지 말한다. */}
          <p className="mt-5 border-t border-white pt-5 text-[min(2.4vw,21px)] font-medium leading-snug text-white/85">
            고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다. 받고 확인을 누르면 그 자리가 다시 빕니다.
          </p>
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-16 border-t-[3px] border-ink"><li><EmptyRow n={1} /></li></ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-16 border-t-[3px] border-ink">
          {commissions.map((c, i) => (
            <li key={c.id}><CommissionCard c={c} n={i + 1} /></li>
          ))}
          <li><EmptyRow n={commissions.length + 1} /></li>
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
 * 점선 테두리에 플러스 기호는 파일 올리는 칸의 생김새다. 게시판에 붙이는 종이는 그렇게 생기지 않았다.
 *
 * 노랑을 여기에 두지 않는다. 이 화면에서 노랑은 "사러 온 사람이 누를 곳" 하나이고,
 * 창작자를 부르는 이 줄은 그다음 일이다. 색이 중요도를 뒤집으면 안 된다.
 */
function EmptyRow({ n }: { n: number }) {
  return (
    <Link href="/open" className="group block border-b border-ink py-8 transition hover:bg-yellow/25">
      <span className="flex items-baseline gap-4">
        <span className="disp num w-[46px] shrink-0 text-[min(3.6vw,34px)] leading-none text-line">
          {String(n).padStart(2, '0')}
        </span>
        <span className="disp text-balance break-keep text-[min(3.2vw,30px)] leading-tight text-line">
          여기에 메뉴 한 장을 붙이세요
        </span>
        <span aria-hidden className="leader hidden h-[1em] min-w-8 flex-1 text-line sm:block" />
        <span className="disp ml-auto w-[196px] shrink-0 text-right text-[min(3.2vw,30px)] leading-none sm:ml-0">
          <span className="bg-yellow px-3 py-1.5 text-[18px] text-ink">메뉴 붙이기</span>
        </span>
      </span>
      <span className="mt-4 block text-[14px] font-medium text-muted sm:pl-[62px]">
        그리는 분이라면 받고 싶은 작업 하나를 메뉴로 붙여 두세요. 자리가 찰 때까지 의뢰가 들어옵니다.
      </span>
    </Link>
  )
}

/**
 * 자리 분수 — 이 화면에서 가장 큰 글자.
 *
 * 그냥 "4/6" 이라고 치면 빗금은 활자에 딸려 온 기본 획이라 숫자보다 얇고 짧다.
 * 400px 로 키우면 그 차이가 그대로 흠이 된다. 그래서 **빗금을 직접 그린다** —
 * 두께는 숫자 획에 맞추고, 높이는 숫자 키에 맞추고, 기울기는 하나로 정한다.
 * 분자와 분모는 **같은 크기, 같은 굵기**다. 한쪽을 줄이면 분수가 아니라 큰 숫자와 작은 숫자 둘이 된다.
 */
function Fraction({ open, all }: { open: number; all: number }) {
  return (
    <span className="num inline-block bg-yellow px-[0.1em] py-[0.04em] align-baseline text-[0.95em] leading-[0.86] text-ink">
      <span>{open}</span>
      {/* 빗금은 활자에 딸려 온 획이 아니라 직접 그린 것이다 — 두께와 키를 숫자에 맞춘다. */}
      <span aria-hidden className="mx-[0.09em] inline-block h-[0.66em] w-[0.075em] -skew-x-[13deg] bg-ink align-baseline" />
      <span>{all}</span>
    </span>
  )
}
