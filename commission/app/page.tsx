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
      <section className="relative left-1/2 -mx-[50vw] w-screen border-b-[3px] border-ink bg-ink">
        <div className="mx-auto max-w-[1200px] px-8 pb-14 pt-5">
          <p className="num text-[12px] font-bold tracking-[0.08em] text-white/50">
            {MONTH.format(new Date())} <span className="text-white/30">/</span> 메뉴 {commissions.length}개
            {' '}<span className="text-white/30">/</span> {openSlots}자리 비어 있음
          </p>
          <p className="mt-3 max-w-3xl text-[20px] font-medium leading-relaxed text-white">
            고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다.
          </p>
          <h1 className="poster -ml-[0.05em] mt-5 whitespace-nowrap text-[min(11.9vw,170px)] tracking-[-0.035em] text-white">
            이번 달 받는 작업
          </h1>
          {/*
            큰 숫자를 오른쪽에 세워 두었더니 화면에 크게 말하는 것이 둘이 되어 서로를 깎아먹었다.
            숫자는 제목 아래 한 줄로 물러난다 — 큰 것은 제목 하나뿐이다.
          */}
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="relative z-10 -mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <li><EmptySlot /></li>
        </ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="relative z-10 -mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
          <li><EmptySlot /></li>
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
    <section className="mt-20">
      <h2 className="disp inline-block border-b-[3px] border-ink pb-2 text-[30px] text-ink">
        보내면 이렇게 됩니다
      </h2>
      {/*
        네모 넷을 나란히 놓고 큰 숫자를 얹는 것은 어느 소개 페이지에나 있는 모양이다.
        상자를 걷고 **한 줄로 잇는다** — 순서는 숫자가 아니라 왼쪽에서 오른쪽으로 흐르는 것이 말한다.
        숫자는 제목 앞에 같은 줄로 붙어 작게 앉는다. 크게 키우면 바로 위 값과 무게로 싸운다.
      */}
      <ol className="mt-6 max-w-3xl">
        {STEPS.map((s) => (
          <li key={s.n} className="flex items-baseline gap-5 border-t-[3px] border-ink py-4 last:border-b-[3px]">
            <span className="disp num w-6 shrink-0 text-[24px] leading-none text-ink">{s.n}</span>
            <span className="w-28 shrink-0 text-[17px] font-extrabold text-ink">{s.t}</span>
            <span className="text-[14px] font-medium leading-relaxed text-strong">{s.d}</span>
          </li>
        ))}
      </ol>
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
      className="group flex h-full flex-col border-[3px] border-dashed border-line bg-white p-4 transition hover:bg-fill"
    >
      <span className="text-[21px] font-bold leading-tight text-ink">여기 붙이기</span>
      <span className="mt-3 block text-[13px] font-bold leading-relaxed text-strong">
        그리는 분이라면 받고 싶은 작업 하나를 메뉴로 붙여 두세요.
      </span>
      <span aria-hidden className="disp mt-auto self-end text-[64px] leading-none text-line">+</span>
    </Link>
  )
}

