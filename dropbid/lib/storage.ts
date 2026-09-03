import { createClient } from '@supabase/supabase-js'

/**
 * 상품 사진과 후원 인증 이미지를 Supabase Storage 에 올린다.
 *
 * **왜 서버에서 올리나** — 브라우저에서 직접 올리려면 올릴 권한을 브라우저에 줘야 하고,
 * 그 열쇠는 누구나 볼 수 있다. 그러면 아무나 우리 저장소를 채울 수 있다.
 * 쓰기는 서버를 거친다는 이 프로젝트의 규칙과도 맞다 (입찰이 `place_bid` 만 거치는 것과 같다).
 *
 * **열쇠가 없으면 꺼진다.** `isConfigured()` 가 false 면 화면이 파일 올리기 대신
 * 주소 붙여넣기로 돌아간다. 열쇠가 없다고 등록 자체가 막히면 안 된다.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
export const BUCKET = 'product-photos'

/** 올릴 수 있는 것. 여기서 막지 않으면 저장소가 쓰레기통이 된다. */
export const MAX_MB = 5
export const MAX_BYTES = MAX_MB * 1024 * 1024
export const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export const isConfigured = () => Boolean(URL_ && SERVICE_KEY)

function client() {
  if (!URL_ || !SERVICE_KEY) throw new Error('스토리지가 설정되지 않았다')
  // 서버에서만 쓴다. 이 열쇠는 브라우저에 절대 가면 안 된다 (NEXT_PUBLIC_ 접두사 금지).
  return createClient(URL_, SERVICE_KEY, { auth: { persistSession: false } })
}

export type UploadResult = { urls: string[] } | { error: string }

/** 사람이 읽을 문구만 돌려준다. 라이브러리 원문을 화면으로 흘리지 않는다. */
export async function uploadImages(files: File[], prefix: string): Promise<UploadResult> {
  for (const f of files) {
    if (f.size > MAX_BYTES) {
      return { error: `사진 한 장은 ${MAX_MB}MB 이하여야 합니다. "${f.name}" 이(가) 너무 큽니다.` }
    }
    if (f.type && !ALLOWED.includes(f.type)) {
      return { error: `사진은 JPG·PNG·WEBP·HEIC 만 올릴 수 있습니다. "${f.name}" 은(는) 안 됩니다.` }
    }
  }

  const sb = client()
  const urls: string[] = []
  for (const [i, f] of files.entries()) {
    // 원래 파일명을 그대로 쓰지 않는다. 한글·공백·중복이 섞이면 주소가 깨진다.
    const ext = (f.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${prefix}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await sb.storage.from(BUCKET).upload(path, f, {
      contentType: f.type || 'image/jpeg',
      upsert: false,
    })
    if (error) {
      console.error('[storage] 업로드 실패:', error)
      return { error: '사진을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.' }
    }
    urls.push(sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
  }
  return { urls }
}
