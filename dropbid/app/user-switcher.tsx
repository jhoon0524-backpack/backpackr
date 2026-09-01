import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    <form action={switchUser} className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">로그인 대신</span>
      <select
        name="userId"
        // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
        // key 를 값에 묶어 다시 그리게 한다.
        key={current ?? 'none'}
        defaultValue={current ?? ''}
        className="rounded border border-zinc-300 px-2 py-1 text-xs"
      >
        <option value="">— 선택 —</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nickname}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-zinc-200 px-2 py-1 text-xs hover:bg-zinc-300">
        전환
      </button>
    </form>
  )
}
