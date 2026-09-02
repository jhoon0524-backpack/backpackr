import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. 창작자·의뢰인 양쪽 화면을 오가며 보기 위한 것이다. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    <form action={switchUser} className="flex items-center gap-2">
      <span className="hidden text-[11px] text-muted sm:inline">로그인 대신</span>
      <div className="flex items-center overflow-hidden rounded-full bg-fill">
        <select
          name="userId"
          // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
          key={current ?? 'none'}
          defaultValue={current ?? ''}
          aria-label="사용자 고르기"
          className="min-h-10 appearance-none bg-transparent py-0 pl-3 pr-1 text-xs font-medium text-strong focus:outline-none"
        >
          <option value="">— 선택 —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.nickname}</option>
          ))}
        </select>
        <button type="submit" className="inline-flex min-h-10 items-center px-3 text-xs font-semibold text-strong hover:bg-line">
          전환
        </button>
      </div>
    </form>
  )
}
