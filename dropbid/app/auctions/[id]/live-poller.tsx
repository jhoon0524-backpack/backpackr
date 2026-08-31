'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 진행 중인 경매 화면을 주기적으로 다시 불러온다.
 *
 * Supabase Realtime 이 붙기 전까지의 폴백이다. 가만히 두면 현재가가 멈춰 있어서,
 * 남이 이미 올려 둔 값을 모르고 입찰했다가 거부당한다.
 * 30초 연장이 걸리는 마감 직전에는 이 시차가 그대로 실패한 입찰이 된다.
 *
 * 마감이 가까울수록 자주 본다. 탭이 숨겨져 있으면 쉰다 — 안 보는 화면을 갱신할 이유가 없다.
 */
export function LivePoller({ endsAt, serverNow }: { endsAt: string; serverNow: string }) {
  const router = useRouter()

  useEffect(() => {
    const skew = new Date(serverNow).getTime() - Date.now()
    let timer: ReturnType<typeof setTimeout>

    const schedule = () => {
      const left = new Date(endsAt).getTime() - (Date.now() + skew)
      // 마감 1분 안: 2초. 그 밖: 7초. 마감이 지났으면 한 번만 더 보고 멈춘다.
      const delay = left <= 0 ? 0 : left < 60_000 ? 2_000 : 7_000
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') router.refresh()
        if (left > 0) schedule()
      }, delay || 1_000)
    }
    schedule()

    // 탭으로 돌아오면 기다리지 않고 바로 맞춘다.
    const onVisible = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [endsAt, serverNow, router])

  return null
}
