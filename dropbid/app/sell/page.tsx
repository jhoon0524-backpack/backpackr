import { SellForm } from './form'

export default function SellPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">상품 등록</h1>
      <p className="mt-1 text-sm text-zinc-500">
        등록하면 검수 대기 상태가 됩니다. 운영자가 후원 인증을 확인한 뒤 다음 드롭에 배정합니다.
      </p>
      <SellForm />
    </div>
  )
}
