import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. 창작자·의뢰인 양쪽 화면을 오가며 보기 위한 것이다. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    <form action={switchUser} className="flex items-center border-2 border-ink bg-white shadow-hard-sm">
      <select
        name="userId"
        // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
        key={current ?? 'none'}
        defaultValue={current ?? ''}
        aria-label="사용자 고르기"
        className="h-9 appearance-none bg-transparent py-0 pl-3 pr-1 text-[13px] font-bold text-ink focus:outline-none"
      >
        <option value="">로그인 대신 고르기</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.nickname}</option>
        ))}
      </select>
      <button type="submit" className="h-9 border-l-2 border-ink bg-accent px-3 text-[13px] font-bold text-white">
        전환
      </button>
    </form>
  )
}
