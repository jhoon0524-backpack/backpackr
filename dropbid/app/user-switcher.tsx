import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    <form action={switchUser} className="flex items-center gap-2">
      <span className="text-xs text-zinc-400">로그인 대신</span>
      <select
        name="userId"
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
