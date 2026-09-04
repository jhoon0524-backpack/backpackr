import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'

export const dynamic = 'force-dynamic'

/** 한글 수사. 열 넘으면 그냥 숫자로 적는다 — "열하나" 는 제호에서 길다. */
const KO_NUM: Record<number, string> = {
  1: '하나', 2: '둘', 3: '셋', 4: '넷', 5: '다섯',
  6: '여섯', 7: '일곱', 8: '여덟', 9: '아홉', 10: '열',
}

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
        <div className="mx-auto max-w-[1200px] px-8 pb-7 pt-4">
          {/*
            제호는 판 폭에 꼭 맞게 짠다. 밑선도 설명도 판 안에 있는데 제호만 밖으로 나가면
            그건 판형이 아니라 사고로 읽힌다.
          */}
          {/*
            숫자를 한글로 적는다.
            제호는 명조인데 명조의 아라비아 숫자는 한글보다 획이 가늘고 폭이 달라, 아무리 손을 봐도
            "숫자만 다른 활자를 붙여 넣은 것" 으로 읽혔다. 여덟 번 지적받은 자리다.
            한글 수사로 적으면 애초에 섞일 얼굴이 없다 — 제호는 한 얼굴 한 덩어리가 된다.
            정확한 값(4/6)은 바로 아래 줄, 숫자를 적는 활자(고딕)로 적는다.
          */}
          <h1 className="poster -ml-[0.035em] border-t border-white/30 pt-6 text-[min(11vw,158px)] leading-[0.9] tracking-[-0.03em] [word-spacing:-0.12em] text-white">
            {openSlots === 0 ? (
              <>지금은 자리가 없어요</>
            ) : (
              <>자리 <span className="text-yellow">{KO_NUM[openSlots] ?? openSlots}</span> 남았어요</>
            )}
          </h1>
          {/* 판의 밑선. 제호가 소리치고, 이 줄이 무슨 뜻인지 말한다. */}
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t border-white pt-5">
            <p className="serif text-[clamp(16px,2.6vw,24px)] leading-relaxed text-white/85">
              고르고 보내면 창작자가 수락하고, 자리 하나가 찹니다. 받고 확인을 누르면 그 자리가 다시 빕니다.
            </p>
          </div>
        </div>
      </section>

      <h2 className="disp mt-14 text-[clamp(24px,3.6vw,36px)] leading-none text-ink">이번 달 메뉴</h2>

      {commissions.length > 0 && (
        /* 장부는 굵은 선으로 열고 굵은 선으로 닫는다. 사이는 가는 선이다. */
        <ul className="mt-8 border-b-2 border-t-2 border-ink">
          {commissions.map((c, i) => (
            <li key={c.id}><CommissionCard c={c} n={i + 1} /></li>
          ))}
        </ul>
      )}

      <EmptyRow />
    </div>
  )
}

/** 아직 아무도 안 붙인 자리. */
function EmptyRow() {
  return (
    /*
      빈 줄에 번호와 점선을 주었더니 **가짜 메뉴 한 줄**이 되었다 — 진짜 셋과 같은 얼굴이라
      목록이 넷으로 읽힌다. 번호도 점선도 빼고, 점선 테두리 한 겹으로 "여기는 아직 비어 있다" 만 말한다.
    */
    <Link
      href="/open"
      className="group mt-12 block"
    >
      {/* 노랑 밑줄과 화살표. 노랑은 이 화면에서 셋뿐이다 — 남은 자리, 지금 보는 곳, 눌러야 할 곳. */}
      <span className="flex flex-wrap items-center gap-x-6 gap-y-4 border border-ink px-6 py-5">
        <span className="disp text-[19px] leading-snug text-ink">
          그리는 분이라면, 여기에 메뉴 한 장을 붙이세요
        </span>
        <span className="text-[15px] font-medium text-muted">
          자리가 찰 때까지 의뢰가 들어옵니다. 자리가 다시 비면 메뉴는 저절로 열립니다.
        </span>
        <span className="disp ml-auto shrink-0 whitespace-nowrap bg-ink px-5 py-2.5 text-[16px] leading-none text-white">
          메뉴 붙이기 →
        </span>
      </span>
    </Link>
  )
}

