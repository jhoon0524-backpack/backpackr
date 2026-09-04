'use client'

import { useState } from 'react'
import { MAX_MB } from '@/lib/storage'

/**
 * 사진 고르기.
 *
 * 고른 사진을 **바로 보여 준다.** 안 보여 주면 무엇을 골랐는지 모른 채 등록을 누르게 된다
 * (실제로 파일 이름만 보이는 기본 입력칸은 그 문제를 그대로 안고 있다).
 *
 * 미리보기는 `URL.createObjectURL` 로 만든다. 아직 올리기 전이라 서버에 없다.
 */
export function PhotoPicker({
  name,
  multiple,
  hint,
}: {
  name: string
  multiple?: boolean
  hint: string
}) {
  const [picked, setPicked] = useState<{ url: string; name: string; mb: string }[]>([])
  const [tooBig, setTooBig] = useState<string[]>([])

  return (
    <div className="mt-1">
      <input
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          picked.forEach((p) => URL.revokeObjectURL(p.url)) // 안 풀면 메모리가 샌다
          const files = [...(e.target.files ?? [])]
          setTooBig(files.filter((f) => f.size > MAX_MB * 1024 * 1024).map((f) => f.name))
          setPicked(
            files.map((f) => ({
              url: URL.createObjectURL(f),
              name: f.name,
              mb: (f.size / 1024 / 1024).toFixed(1),
            })),
          )
        }}
        className="block w-full text-xs file:mr-3 file:min-h-11 file:rounded file:border-0
                   file:bg-fill file:px-4 file:text-xs file:font-medium file:text-strong"
      />
      <span className="mt-1 block font-normal text-muted">{hint}</span>

      {tooBig.length > 0 && (
        <p className="mt-2 rounded bg-urgent-wash px-3 py-2 text-xs text-strong">
          {tooBig.join(', ')} 은(는) {MAX_MB}MB 를 넘습니다. 등록할 때 거부됩니다.
        </p>
      )}

      {picked.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {picked.map((p) => (
            <figure key={p.url} className="shrink-0">
              {/* 미리보기라 next/image 를 쓰지 않는다. blob: 주소는 최적화 대상이 아니다. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.name}
                className="h-20 w-20 rounded border border-line object-cover"
              />
              <figcaption className="mt-0.5 w-20 truncate text-[10px] text-muted">
                {p.mb}MB
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
