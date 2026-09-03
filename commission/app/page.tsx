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
        <div className="mx-auto max-w-[1200px] px-8 pt-5">
          <p className="num text-[13px] font-bold text-white/60">
            {MONTH.format(new Date())} 메뉴판 <span className="text-white/30">·</span> 메뉴 {commissions.length}개
          </p>
          {/*
            제호는 **한 덩어리**다. 숫자와 말이 따로 놓여 있으면 둘 다 어중간해진다.
            분수를 왼쪽에 세우고 그 오른쪽 밑선에 말을 붙여, 하나의 큰 글자 덩어리로 읽히게 한다.
          */}
          <div className="mt-1 flex flex-wrap items-end gap-x-6">
            <Fraction open={openSlots} all={allSlots} />
            <p className="poster pb-[0.06em] text-[min(7.4vw,88px)] leading-[0.86] text-yellow">
              자리 남았어요
            </p>
          </div>
          {/*
            판의 밑선. 호수는 허공에 뜬 세로 글씨였는데, 그건 어디에도 붙어 있지 않은 장식이다.
            검정 판이 끝나는 선 위에 앉혀 판의 바닥으로 삼는다.
          */}
          <div className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t-[3px] border-white py-5">
            <p className="max-w-2xl text-[17px] font-bold leading-relaxed text-white">
              고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다.
            </p>
            <p className="num shrink-0 text-[13px] font-bold text-white/60">
              {MONTH.format(new Date())}호
            </p>
          </div>
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-16 grid grid-cols-1 gap-6">
          <li><EmptySlot /></li>
        </ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
 * 화면 아래가 비어 있었다. 장식으로 채우지 않는다 —
 * 처음 온 사람이 실제로 모르는 것을 넣는다: **보내고 나면 그다음에 무슨 일이 일어나는가.**
 * 커미션은 결제 버튼을 누르면 끝나는 물건이 아니라 사람과 사람 사이의 일이라, 이 네 칸이 곧 안내다.
 */
const STEPS = [
  { n: '1', t: '고른다', d: '자리가 남은 메뉴를 고르고, 무엇을 원하는지 적어 보냅니다.' },
  { n: '2', t: '수락한다', d: '창작자가 보고 최종가를 정해 수락합니다. 이때 자리 하나가 찹니다.' },
  { n: '3', t: '작업한다', d: '수락한 날부터 메뉴에 적힌 기간 안에 작업합니다.' },
  { n: '4', t: '받는다', d: '결과물을 받고 확인을 누르면 끝. 그때 자리가 다시 빕니다.' },
]

function HowItWorks() {
  return (
    /*
      메뉴판에서 갑자기 소개 페이지로 바뀌던 자리다. 굵은 테두리도 검정도 여기서 끊겼다.
      머리와 같은 검정 띠로 받아 화면을 닫는다 — 위에서 시작한 판이 아래에서 같은 판으로 끝난다.
    */
    <section className="relative left-1/2 -mx-[50vw] mt-16 w-screen border-t-[3px] border-ink bg-ink">
      <div className="mx-auto max-w-[1200px] px-8 py-14">
        <h2 className="disp text-[36px] text-white">보내면 이렇게 됩니다</h2>
        <ol className="mt-8 border-t-[3px] border-white">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="grid grid-cols-[40px_1fr] items-baseline gap-x-5 gap-y-1 border-b-[3px] border-white py-5 sm:grid-cols-[40px_180px_1fr]"
            >
              <span className="disp text-[28px] leading-none text-white">{s.n}</span>
              <span className="disp text-[24px] leading-none text-white">{s.t}</span>
              <span className="col-span-2 text-[15px] font-medium leading-relaxed text-white/60 sm:col-span-1">
                {s.d}
              </span>
            </li>
          ))}
        </ol>
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
      className="group flex items-stretch border-[3px] border-ink bg-white shadow-hard transition hover:-translate-x-1 hover:-translate-y-1"
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
    <h1 className="poster num flex items-end text-[min(22vw,268px)] leading-[0.78] text-white">
      <span>{open}</span>
      <span aria-hidden className="mx-[0.05em] mb-[0.015em] block h-[0.72em] w-[0.072em] -skew-x-[13deg] bg-white" />
      <span>{all}</span>
      <span className="sr-only">자리 가운데 {open}자리</span>
    </h1>
  )
}
