'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/** 로그인 대신 쓰는 임시 사용자 전환. 카카오 로그인이 붙으면 사라진다. */
export async function switchUser(formData: FormData) {
  const jar = await cookies()
  jar.set('demo_user', String(formData.get('userId')), { path: '/' })
  revalidatePath('/', 'layout')
}
