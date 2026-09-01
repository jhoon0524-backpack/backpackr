'use client'

import { useActionState } from 'react'
import { submitProduct, type SellState } from './actions'
import { MoneyInput } from '../money-input'

const field = 'mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm'

export function SellForm() {
  const [state, action, pending] = useActionState<SellState, FormData>(submitProduct, null)
  const v = state?.values ?? {}

  return (
    <form action={action} className="mt-5 space-y-4 rounded-lg border border-zinc-200 bg-white px-5 py-5">
      <label className="block text-xs text-zinc-500">
        상품명
        <input name="title" defaultValue={v.title} className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-zinc-500">
          원 펀딩 프로젝트명
          <input name="fundingProjectName" defaultValue={v.fundingProjectName} className={field} />
        </label>
        <label className="block text-xs text-zinc-500">
          펀딩 페이지 링크 (선택)
          <input name="fundingProjectUrl" defaultValue={v.fundingProjectUrl} className={field} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-zinc-500">
          카테고리
          <select name="category" defaultValue={v.category ?? '웹툰·일러스트'} className={field}>
            <option>웹툰·일러스트</option>
            <option>보드게임·TRPG</option>
          </select>
        </label>
        <label className="block text-xs text-zinc-500">
          상태 등급
          <select name="conditionGrade" defaultValue={v.conditionGrade ?? 'A'} className={field}>
            <option value="A">A · 미개봉/새것</option>
            <option value="B">B · 사용감 적음</option>
            <option value="C">C · 사용감 있음</option>
          </select>
        </label>
      </div>

      {/*
        두 칸 모두 "무엇을 넣으라는 것인지" 가 없어 처음 팔아 보는 사람이 막혔다
        (UI/UX 1회차 발견 2번). 사진칸은 빈 여러 줄 입력칸이라 파일을 올리는
        곳처럼 보이는데 실제로는 주소를 받는다. 예시를 넣어 그 오해를 끊는다.
      */}
      <label className="block text-xs text-zinc-500">
        사진 (3장 이상, 한 줄에 하나씩)
        {/* 업로드가 아직 없어서 주소를 받는다. Supabase Storage 가 붙으면 파일 선택으로 바뀐다. */}
        <textarea
          name="photoUrls"
          rows={3}
          defaultValue={v.photoUrls}
          placeholder={'https://…/앞면.jpg\nhttps://…/뒷면.jpg\nhttps://…/구성품.jpg'}
          className={field}
        />
        <span className="mt-1 block font-normal text-zinc-500">
          파일 올리기는 아직 준비 중입니다. 지금은 <b>이미지 주소</b>를 한 줄에 하나씩 넣어 주세요.
        </span>
      </label>

      <label className="block text-xs text-zinc-500">
        후원 인증 이미지 — 없으면 등록되지 않습니다
        <input
          name="backerProofUrl"
          defaultValue={v.backerProofUrl}
          placeholder="https://…/후원내역.png"
          className={field}
        />
        <span className="mt-1 block font-normal text-zinc-500">
          원 펀딩에서 <b>이 상품을 후원한 내역</b>이 보이는 화면을 캡처해 올린 주소입니다.
          운영자가 눈으로 확인합니다. 결제 정보는 가리고 올려 주세요.
        </span>
      </label>

      <label className="block text-xs text-zinc-500">
        시작가 (1,000원 이상)
        <MoneyInput
          name="startPrice"
          defaultValue={v.startPrice ?? '10000'}
          className={`${field} pr-8 tabular-nums`}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-zinc-400"
      >
        {pending ? '등록 중…' : '검수 신청'}
      </button>

      {state?.message && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      )}
    </form>
  )
}
