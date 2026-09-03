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
          <h1 className="poster whitespace-nowrap text-[min(11.0vw,158px)] leading-[0.9] tracking-[0.015em] text-white">
            자리 <Fraction open={openSlots} all={allSlots} /> 남았어요
          </h1>
          {/* 판의 밑선. 제호가 소리치고, 이 줄이 무슨 뜻인지 말한다. */}
          <div className="mt-5 border-t border-white/60 pt-5">
            <ol className="flex flex-wrap items-baseline gap-x-10 gap-y-2 text-[min(3.2vw,28px)] leading-tight">
              {STEPS.map((t) => (
                <li key={t} className="disp text-white">{t}</li>
              ))}
            </ol>
            <p className="mt-4 text-[15px] font-medium leading-relaxed text-white/70">
              고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다. 받고 확인을 누르면 그 자리가 다시 빕니다.
            </p>
          </div>
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-16 border-t-[3px] border-ink"><li><EmptyRow /></li></ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-16 border-t-[3px] border-ink">
          {commissions.map((c, i) => (
            <li key={c.id}><CommissionCard c={c} n={i + 1} /></li>
          ))}
          <li><EmptyRow /></li>
        </ul>
      )}

    </div>
  )
}

/**
 * 이 서비스 전체를 네 마디로. 제호 바로 아래, 검정 판 안에 둔다.
 * 흰 판 한가운데 이 네 마디만 덩그러니 두었더니 제목도 마디도 아닌 것이 되었다.
 */
const STEPS = ['고른다', '수락한다', '작업한다', '받는다']

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
function EmptyRow() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-ink py-8 text-[15px] font-medium text-muted">
      그리는 분이라면 받고 싶은 작업 하나를 메뉴로 붙여 두세요.
      {/* 이 화면에서 창작자가 눌러야 할 곳은 여기 하나다. 문장 속 밑줄로는 눌러야 할 곳으로 안 보인다. */}
      <Link href="/open" className="disp inline-flex items-center bg-ink px-4 py-2 text-[15px] leading-none text-white hover:bg-strong">
        메뉴 붙이기
      </Link>
    </p>
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
    <span className="num inline-flex h-[1.02em] items-end bg-yellow px-[0.12em] pb-[0.05em] align-baseline text-[1.1em] leading-none text-ink">
      <span>{open}</span>
      {/* 빗금은 활자에 딸려 온 획이 아니라 직접 그린 것이다 — 두께와 키를 숫자에 맞춘다. */}
      <span aria-hidden className="mx-[0.08em] mb-[0.05em] block h-[0.66em] w-[0.1em] -skew-x-[13deg] bg-ink" />
      <span>{all}</span>
    </span>
  )
}
