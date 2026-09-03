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
        <div className="mx-auto max-w-[1200px] px-8 pb-9 pt-5">
          <p className="num text-[13px] font-bold text-white/60">
            {MONTH.format(new Date())} 메뉴판 <span className="text-white/40">·</span> 메뉴 {commissions.length}개
          </p>
          {/*
            제호는 판 폭에 꼭 맞게 짠다. 밑선도 설명도 판 안에 있는데 제호만 밖으로 나가면
            그건 판형이 아니라 사고로 읽힌다.
          */}
          <h1 className="poster mt-4 whitespace-nowrap text-[min(10.6vw,152px)] leading-[0.9] text-white">
            자리 <Fraction open={openSlots} all={allSlots} /> 남았어요
          </h1>
          {/* 판의 밑선. 제호가 소리치고, 이 줄이 무슨 뜻인지 말한다. */}
          <p className="disp mt-6 border-t-[3px] border-white pt-5 text-[min(3.4vw,28px)] leading-tight text-white">
            고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다.
          </p>
        </div>
      </section>

      {commissions.length === 0 ? (
        <ul className="mt-16 border-t-[3px] border-ink"><li><EmptyRow /></li></ul>
      ) : (
        /* 칸 사이를 좁혀 판을 빽빽하게 채운다. 넉넉히 띄우면 메뉴판이 아니라 요금제 표처럼 보인다. */
        <ul className="mt-16 border-t-[3px] border-ink">
          {/* 장부의 머리. 어느 칸이 무엇인지 한 번만 말한다. */}
          <li className="grid grid-cols-12 gap-x-4 border-b border-ink/25 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            <span className="col-span-5">메뉴</span>
            <span className="hidden lg:col-span-3 lg:block">창작자</span>
            <span className="hidden text-right lg:col-span-2 lg:block">값</span>
            <span className="hidden text-right lg:col-span-2 lg:block">자리</span>
          </li>
          {commissions.map((c) => (
            <li key={c.id}><CommissionCard c={c} /></li>
          ))}
          <li><EmptyRow /></li>
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
const STEPS = [
  { t: '고른다', d: '자리가 남은 메뉴에 원하는 것을 적어 보냅니다.' },
  { t: '수락한다', d: '창작자가 값을 정해 수락하면 자리 하나가 찹니다.' },
  { t: '작업한다', d: '메뉴에 적힌 기간 안에 작업이 끝납니다.' },
  { t: '받는다', d: '받고 확인을 누르면 그 자리가 다시 빕니다.' },
]

function HowItWorks() {
  return (
    <section className="relative left-1/2 -mx-[50vw] mt-16 w-screen border-t-[3px] border-ink bg-ink">
      <div className="mx-auto max-w-[1200px] px-8 py-16">
        <ol className="grid grid-cols-1 gap-x-6 gap-y-10 border-t-[3px] border-white sm:grid-cols-2 lg:grid-cols-12">
          {STEPS.map((s) => (
            <li key={s.t} className="relative pt-7 lg:col-span-3">
              {/* 눈금. 시간선 위에 넷을 찍는다. */}
              <span aria-hidden className="absolute left-0 top-0 h-4 w-[3px] bg-white" />
              <span className="poster block text-[min(4.4vw,46px)] leading-none text-white">{s.t}</span>
              <span className="mt-4 block text-[15px] font-medium leading-relaxed text-white/70">{s.d}</span>
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
function EmptyRow() {
  return (
    <Link
      href="/open"
      className="grid grid-cols-12 items-end gap-x-4 gap-y-3 border-b-[3px] border-ink py-6 transition hover:bg-yellow/25"
    >
      <span className="col-span-12 lg:col-span-10">
        <span className="block text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-muted">빈 줄</span>
        <span className="disp mt-2 block text-[min(3.2vw,30px)] leading-tight text-muted">
          그리는 분이라면, 여기에 메뉴 한 장을 붙이세요.
        </span>
      </span>
      <span className="col-span-12 flex lg:col-span-2 lg:justify-end">
        <span className="num inline-flex items-center border-[3px] border-ink px-3 py-1.5 text-[13px] font-bold leading-none text-ink">
          메뉴 붙이기
        </span>
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
    <span className="num inline-flex items-end text-[1.2em] text-yellow">
      <span>{open}</span>
      {/* 빗금은 흰색이다. 노랑 숫자 사이에 노랑 빗금을 두면 셋이 한 덩어리로 뭉쳐 분수가 안 읽힌다. */}
      <span aria-hidden className="mx-[0.05em] mb-[0.055em] block h-[0.66em] w-[0.075em] -skew-x-[13deg] bg-white" />
      <span>{all}</span>
    </span>
  )
}
