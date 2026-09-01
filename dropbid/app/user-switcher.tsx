import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    /*
      로그인이 붙기 전까지의 임시 장치다. 그래도 모든 화면 맨 위에 있으니
      "손 안 댄 시제품" 으로 보이면 안 된다 (사장님 지적).
      회색 네모 두 개를 나란히 두는 대신 한 덩어리로 묶고, 안내 문구는
      작게 줄여 뒤로 물린다.
    */
    <form action={switchUser} className="flex items-center gap-2">
      <span className="hidden text-[11px] text-muted sm:inline">로그인 대신</span>
      <div className="flex items-center overflow-hidden rounded-full bg-fill">
        <select
          name="userId"
          // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
          // key 를 값에 묶어 다시 그리게 한다.
          key={current ?? 'none'}
          defaultValue={current ?? ''}
          aria-label="사용자 고르기"
          className="min-h-10 appearance-none bg-transparent py-0 pl-3 pr-1 text-xs font-medium text-strong focus:outline-none"
        >
          <option value="">— 선택 —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nickname}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center px-3 text-xs font-semibold text-strong hover:bg-line"
        >
          전환
        </button>
      </div>
    </form>
  )
}
