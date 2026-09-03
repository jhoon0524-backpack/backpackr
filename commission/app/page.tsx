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
  const allSlots = commissions.reduce((n, c) => n + c.max_slots, 0)

  return (
    <div>
      {/* 머리와 이어 붙은 한 덩어리다. 위쪽 선을 없애 머리에서 그대로 흘러내리게 한다. */}
      <section className="relative left-1/2 -mx-[50vw] w-screen border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-[1200px] px-8 pb-8 pt-8">
          {/*
            제호는 **한 크기, 한 얼굴, 두 줄**이다. 숫자만 크게 키워 두면 숫자와 말이 서로 다른
            물건처럼 놓이고, 그걸 붙이려고 밑선을 맞출수록 판만 길어진다.
            크기는 하나로 두고 **색으로** 강조한다 — 노랑은 매 순간 바뀌는 값 하나에만.

            설명 한 줄은 제호 오른쪽, 마지막 줄과 같은 밑선에 앉는다. 아래로 내려 두면
            제호 오른쪽이 통째로 비고, 그 빈 곳은 여백이 아니라 안 채운 자리로 읽힌다.
          */}
          <h1 className="poster whitespace-nowrap text-[min(10.6vw,152px)] leading-[0.9] text-white">
            자리 <Fraction open={openSlots} all={allSlots} /> 남았어요
          </h1>
          {/* 판의 밑선. 설명과 발행 정보를 양 끝에 걸어 검정 판의 바닥으로 삼는다. */}
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-t-[3px] border-white pt-4">
            <p className="text-[16px] font-bold text-white">고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다.</p>
            <p className="num text-[14px] font-bold tracking-[0.02em] text-white/70">
              {MONTH.format(new Date())} 메뉴판 <span className="text-white/40">·</span> 메뉴 {commissions.length}개
            </p>
          </div>
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-14 grid grid-cols-1 gap-6">
          <li><EmptySlot /></li>
        </ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
          <li className="sm:col-span-2 lg:col-span-3"><EmptySlot /></li>
        </ul>
      )}

      <HowItWorks />
    </div>
  )
}

/**
 * 보내고 나면 무슨 일이 일어나는가.
 *
 * 넉 칸짜리 "이렇게 됩니다" 표는 어느 소개 페이지에나 있는 틀이다. 번호·굵은 제목·회색 한 줄이
 * 네 번 반복되면 읽는 사람은 넷 다 안 읽는다. 그래서 **동사 넉 개를 한 줄로 세우고**,
 * 설명은 그 아래 한 문단으로 몰아 준다. 볼 것은 한 줄, 읽을 것은 한 문단.
 */
const STEPS = ['고른다', '수락한다', '작업한다', '받는다']

function HowItWorks() {
  return (
    <section className="relative left-1/2 -mx-[50vw] mt-16 w-screen border-t-[3px] border-ink bg-ink">
      <div className="mx-auto max-w-[1200px] px-8 py-14">
        <ol className="flex flex-wrap items-baseline">
          {STEPS.map((t, i) => (
            <li
              key={t}
              className={`poster text-[min(5vw,58px)] leading-none text-white ${
                i > 0 ? 'ml-6 border-l-[3px] border-white/35 pl-6' : ''
              }`}
            >
              {t}
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-3xl text-[17px] font-medium leading-relaxed text-white/70">
          자리가 남은 메뉴에 원하는 것을 적어 보내면, 창작자가 최종가를 정해 수락합니다. 그때 자리 하나가 차고,
          메뉴에 적힌 기간 안에 작업이 끝납니다. 결과물을 받고 확인을 누르면 자리가 다시 빕니다.
        </p>
      </div>
    </section>
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
function EmptySlot() {
  return (
    <Link
      href="/open"
      className="group flex items-stretch border-[3px] border-ink bg-white transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard"
    >
      <span className="disp flex shrink-0 items-center bg-ink px-6 text-[19px] text-white">
        여기 붙이기
      </span>
      <span className="flex items-center px-6 py-5 text-[15px] font-medium leading-relaxed text-ink">
        그리는 분이라면 받고 싶은 작업 하나를 메뉴로 붙여 두세요. 자리가 찰 때까지 의뢰가 들어와요.
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
    <span className="num inline-flex items-end">
      <span>{open}</span>
      <span aria-hidden className="mx-[0.03em] mb-[0.055em] block h-[0.66em] w-[0.075em] -skew-x-[13deg] bg-current" />
      <span>{all}</span>
    </span>
  )
}
