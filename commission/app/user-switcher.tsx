import { listDemoUsers } from '@/lib/db'
import { getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. 창작자·의뢰인 양쪽 화면을 오가며 보기 위한 것이다. */
export async function UserSwitcher() {
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    /*
      로그인이 붙기 전까지의 임시 장치다. 테두리·그림자·빨강 버튼으로 꾸며 두면
      머리에서 가장 무거운 물건이 되어 정작 중요한 것들보다 먼저 눈에 든다. 실선 하나로 물러나 있게 한다.
    */
    /*
      회색 글자 둘이 나란히 떠 있으니 길이 하나 더 난 것처럼 보였다. 선 하나로 묶어
      "이건 임시 장치" 라고 한 덩어리로 말하게 한다.
    */
    <form action={switchUser} className="flex h-9 items-center gap-2">
      <select
        name="userId"
        // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
        key={current ?? 'none'}
        defaultValue={current ?? ''}
        aria-label="사용자 고르기"
        className="h-full appearance-none bg-ink text-[15px] font-bold text-white/60 hover:text-white focus:outline-none"
      >
        <option value="">누구로 볼까요</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.nickname}</option>
        ))}
      </select>
      <button type="submit" className="h-full text-[15px] font-bold text-white/60 underline decoration-[2px] underline-offset-4 hover:text-yellow">
        바꾸기
      </button>
    </form>
  )
}
