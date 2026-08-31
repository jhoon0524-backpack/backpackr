import Link from 'next/link'
import { listMyBids, listMySales, listMyWins } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { won, kst } from '@/lib/format'
import { Countdown } from '../time'
import { RelistForm } from './relist-form'
import { PhoneForm } from './phone-form'

export const dynamic = 'force-dynamic'


const PRODUCT_STATUS: Record<string, string> = {
  pending: '검수 대기',
  scheduled: '배정됨',
  rejected: '반려',
}
const AUCTION_STATUS: Record<string, string> = {
  scheduled: '시작 전',
  live: '진행 중',
  sold: '낙찰',
  unsold: '유찰',
  payment_failed: '미결제',
}
const ORDER_STATUS: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  failed: '기한 초과',
}

/** 마감 뒤에는 "최고가/밀림" 이 아니라 결과를 보여 준다. 안 그러면 진행 중으로 읽힌다. */
function bidBadge(status: string, isWinning: boolean) {
  if (status === 'live') {
    return isWinning
      ? { label: '최고가', tone: 'bg-emerald-50 text-emerald-700' }
      : { label: '밀림', tone: 'bg-zinc-100 text-zinc-600' }
  }
  if (status === 'sold') {
    return isWinning
      ? { label: '낙찰', tone: 'bg-emerald-50 text-emerald-700' }
      : { label: '낙찰 실패', tone: 'bg-zinc-100 text-zinc-500' }
  }
  if (status === 'unsold') return { label: '유찰', tone: 'bg-zinc-100 text-zinc-500' }
  if (status === 'payment_failed') return { label: '미결제 종료', tone: 'bg-zinc-100 text-zinc-500' }
  return { label: '시작 전', tone: 'bg-zinc-100 text-zinc-500' }
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-5 py-8 text-center text-sm text-zinc-600">
      {children}
    </div>
  )
}

export default async function MyPage(props: PageProps<'/me'>) {
  const sp = await props.searchParams
  const registered = sp.registered === '1'
  const relisted = sp.relisted === '1'
  const phoneSaved = sp.phone === 'saved'
  const me = await getCurrentUser()
  if (!me) {
    return (
      <Empty>
        위쪽에서 사용자를 고르면 내 입찰·낙찰·판매를 볼 수 있습니다.
        <br />
        <span className="text-xs text-zinc-500">카카오 로그인이 붙으면 이 선택은 사라집니다.</span>
      </Empty>
    )
  }

  const [bids, wins, sales] = await Promise.all([
    listMyBids(me.id),
    listMyWins(me.id),
    listMySales(me.id),
  ])
  // 남은 시간은 브라우저 시계가 아니라 서버 시각을 기준으로 센다.
  const serverNow = new Date().toISOString()

  return (
    <div className="space-y-8">
      <div>
        {registered && (
          <p className="mb-4 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            등록했습니다. <span className="font-medium">검수 대기</span> 상태이며, 운영자가 후원
            인증을 확인한 뒤 결과를 알려드립니다. 아래 <span className="font-medium">판매</span>{' '}
            목록에서 진행 상태를 볼 수 있습니다.
          </p>
        )}
        {phoneSaved && (
          <p className="mb-4 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            연락처를 저장했습니다. 이제 입찰과 상품 등록을 할 수 있습니다.
          </p>
        )}
        {relisted && (
          <p className="mb-4 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            같은 내용으로 다시 올렸습니다. <span className="font-medium">검수 대기</span> 상태이며,
            승인되면 다음 회차에 배정됩니다.
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{me.nickname} 님</h1>
        {/* 연락처가 없으면 입찰도 등록도 막힌다. 여기서 바로 풀 수 있게 한다. */}
        <div
          className={`mt-3 rounded px-4 py-3 ${
            me.phone ? 'bg-zinc-100' : 'bg-amber-50'
          }`}
        >
          <p className={`text-sm ${me.phone ? 'text-zinc-700' : 'text-amber-900'}`}>
            {me.phone ? (
              <>
                연락처 <span className="font-medium tabular-nums">{me.phone}</span>
              </>
            ) : (
              '연락처가 등록되어 있지 않아 입찰과 상품 등록이 막혀 있습니다.'
            )}
          </p>
          <PhoneForm current={me.phone} />
          <p className="mt-2 text-xs text-zinc-500">
            낙찰·배송 연락에만 씁니다. 다른 사용자에게 보이지 않습니다.
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">내 입찰</h2>
        {bids.length === 0 ? (
          <Empty>
            아직 입찰한 경매가 없습니다. <Link href="/" className="underline">드롭 목록 보기</Link>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {bids.map((b) => (
              <li
                key={b.auction_id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <Link href={`/auctions/${b.auction_id}`} className="min-w-0 truncate hover:underline">
                  {b.title}
                </Link>
                <span className="ml-4 shrink-0 text-right text-xs">
                  <span className="tabular-nums">내 입찰 {won(b.my_amount)}</span>
                  <span className="mx-1 text-zinc-300">/</span>
                  <span className="tabular-nums text-zinc-500">현재 {won(b.current_price)}</span>
                  <span className={`ml-2 rounded px-1.5 py-0.5 ${bidBadge(b.status, b.is_winning).tone}`}>
                    {bidBadge(b.status, b.is_winning).label}
                  </span>
                  {b.status === 'live' && (
                    <span className="ml-2 text-zinc-500">
                      마감 <Countdown endsAt={b.ends_at.toISOString()} serverNow={serverNow} />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">낙찰</h2>
        {wins.length === 0 ? (
          <Empty>아직 낙찰받은 것이 없습니다.</Empty>
        ) : (
          <ul className="space-y-2">
            {wins.map((w) => (
              <li
                key={w.auction_id}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={`/auctions/${w.auction_id}`}
                    className="min-w-0 truncate hover:underline"
                  >
                    {w.title}
                  </Link>
                  <span className="ml-4 shrink-0 text-right text-xs">
                    <span className="tabular-nums">{won(w.amount)}</span>
                    <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5">
                      {ORDER_STATUS[w.order_status] ?? w.order_status}
                    </span>
                  </span>
                </div>

                {/* 24시간짜리 기한이다. 남은 시간과 결제 자리를 여기서 바로 보여 준다. */}
                {w.order_status === 'pending' && (
                  <div className="mt-3 rounded bg-amber-50 px-3 py-3 text-center">
                    <p className="text-sm text-amber-900">
                      {kst(w.due_at)}까지 결제해야 합니다.
                    </p>
                    <p className="mt-1 text-xs text-amber-800">
                      <Countdown endsAt={w.due_at.toISOString()} serverNow={serverNow} format="long" />
                    </p>
                    <button
                      type="button"
                      disabled
                      title="포트원 결제 연동 후 열립니다"
                      className="mt-2 rounded bg-zinc-300 px-4 py-2 text-sm text-white"
                    >
                      결제하러 가기
                    </button>
                    <p className="mt-1 text-xs text-amber-700">
                      결제 연동(포트원) 전이라 아직 누를 수 없습니다.
                    </p>
                  </div>
                )}
                {w.order_status === 'failed' && (
                  <p className="mt-3 rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                    기한 안에 결제되지 않아 거래가 종료되었습니다.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-700">판매</h2>
        {sales.length === 0 ? (
          <Empty>
            아직 올린 상품이 없습니다. <Link href="/sell" className="underline">상품 등록하기</Link>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {sales.map((s) => (
              <li key={s.product_id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="min-w-0 truncate">{s.title}</span>
                  <span className="ml-4 shrink-0 text-xs">
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5">
                      {PRODUCT_STATUS[s.product_status] ?? s.product_status}
                    </span>
                    {s.auction_status && (
                      <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5">
                        {AUCTION_STATUS[s.auction_status] ?? s.auction_status}
                      </span>
                    )}
                    {s.current_price !== null && (
                      <span className="ml-2 tabular-nums text-zinc-500">{won(s.current_price)}</span>
                    )}
                  </span>
                </div>
                {s.rejection_reason && (
                  <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700">
                    반려 사유: {s.rejection_reason}
                  </p>
                )}
                {/* 유찰·미결제로 끝나면 여기서 막다른 길이었다. */}
                {s.can_relist && <RelistForm productId={s.product_id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
