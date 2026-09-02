import Link from 'next/link'
import { listOpenCommissions } from '@/lib/db'
import { CommissionCard } from './commission-card'
import { BTN_INK, EYEBROW } from './ui'

export const dynamic = 'force-dynamic'

const MONTH = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long' })

export default async function CommissionList() {
  const commissions = await listOpenCommissions()
  const [first, ...rest] = commissions

  return (
    <div>
      {/* 잡지 머리: 작은 꼬리표, 큰 명조 제목, 한 줄 설명. 열린 수는 제목 안에 피치색 숫자로. */}
      <div className="flex flex-col gap-3 pb-7">
        <p className={EYEBROW}>창작자 맞춤 작업 · {MONTH.format(new Date())}</p>
        <h1 className="serif text-[40px] font-bold leading-[1.12] tracking-tight sm:text-[52px]">
          지금 열려 있는<br />작업실 <span className="num text-urgent-text">{commissions.length}</span>
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-strong">창작자가 이번 달에 받는 작업입니다. 자리가 남은 곳에 의뢰할 수 있습니다.</p>
      </div>

      {commissions.length === 0 ? (
        <div className="border-t border-ink py-16 text-center">
          <p className="serif text-xl font-bold">아직 열린 작업실이 없습니다.</p>
          <p className="mt-2 text-sm text-muted">창작자라면 첫 작업실을 열어 보세요.</p>
          <Link href="/open" className={BTN_INK + ' mt-6 !w-auto'}>작업실 열기</Link>
        </div>
      ) : (
        <div className="border-t border-ink">
          {/* 첫 칸은 크게 한 줄을 다 쓴다. 나머지는 좁은 화면 2열, 넓은 화면 4열. */}
          <div className="border-b border-line py-5 lg:hidden">
            <CommissionCard c={first} featured />
          </div>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-9 py-6 sm:grid-cols-3 lg:grid-cols-4">
            <li className="hidden lg:block"><CommissionCard c={first} /></li>
            {rest.map((c) => (
              <li key={c.id}><CommissionCard c={c} /></li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 border border-ink p-6">
        <p className="serif text-xl font-bold">창작자이신가요</p>
        <p className="text-sm leading-relaxed text-strong">받고 싶은 작업 하나를 메뉴로 열어 두면, 의뢰가 이 작업실로 들어옵니다.</p>
        <Link href="/open" className={BTN_INK + ' mt-3 sm:!w-auto'}>작업실 열기</Link>
      </div>
    </div>
  )
}
