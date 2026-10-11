import { listDemoUsers } from '@/lib/db'
import { demoLoginEnabled, getCurrentUserId } from '@/lib/session'
import { switchUser } from './session-actions'

/** 로그인 자리에 임시로 놓인 사용자 전환기. 창작자·의뢰인 양쪽 화면을 오가며 보기 위한 것이다. */
export async function UserSwitcher() {
  // 잠겨 있으면 고를 수 있는 것처럼 보이지 않게 한다. 눌러도 아무 일이 없는 조작기는
  // "고장" 으로 읽히고, 사람은 고장 난 화면에서 자기가 뭘 잘못했는지 찾는다.
  if (!demoLoginEnabled()) {
    return (
      <p className="text-[13px] font-medium text-muted">
        로그인이 아직 없어 이 주소에서는 다른 사람으로 볼 수 없습니다.
      </p>
    )
  }
  const users = await listDemoUsers()
  const current = await getCurrentUserId()

  return (
    /*
      로그인 기능이 생기기 전까지의 임시 장치다. 테두리·그림자·빨강 버튼으로 꾸며 두면
      머리에서 가장 무거운 물건이 되어 정작 중요한 것들보다 먼저 눈에 든다. 실선 하나로 물러나 있게 한다.
    */
    /*
      전에는 둘을 높이 44 상자 **안에** 넣었다. 테두리 2px 를 빼고 나면 실제로 누르는 것은
      선택칸 80×40, 바꾸기 38×40 — 둘 다 44 에 못 미쳤고 서로 붙어 있었다 (검사표 C1·C2, 실패 10·11).
      상자를 걷고 각자 높이 44 를 채우게 두고, 사이를 8px 띄운다.
    */
    <form action={switchUser} className="flex flex-wrap items-center gap-2">
      <select
        name="userId"
        // 전환 뒤 서버가 새 값을 그려도 브라우저가 기존 select 를 재사용해 빈 칸으로 보인다.
        key={current ?? 'none'}
        defaultValue={current ?? ''}
        aria-label="사용자 고르기"
        className="h-11 min-w-11 border-[2px] border-ink bg-white px-3 text-[14px] font-bold text-ink"
      >
        <option value="">누구로 볼까요</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.nickname}</option>
        ))}
      </select>
      <button type="submit" className="h-11 min-w-11 border-[2px] border-ink bg-white px-4 text-[14px] font-bold text-ink hover:bg-fill">
        바꾸기
      </button>
    </form>
  )
}
