'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { demoLoginEnabled } from '@/lib/session'

/**
 * 로그인 대신 쓰는 임시 사용자 전환. 카카오 로그인이 붙으면 사라진다.
 *
 * 이 함수는 폼에서 받은 id 를 검증 없이 그대로 믿는다 — 그게 시연용 장치의 본질이다.
 * 그래서 꺼져 있으면 **아무 일도 하지 않는다.** 읽는 쪽(`getCurrentUserId`)만 막고
 * 쓰는 쪽을 열어 두면, 쿠키는 심어지고 나중에 켜는 순간 남의 것이 된다.
 */
export async function switchUser(formData: FormData) {
  if (!demoLoginEnabled()) return
  const jar = await cookies()
  jar.set('demo_user', String(formData.get('userId')), { path: '/' })
  revalidatePath('/', 'layout')
}
