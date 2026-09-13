# 제갈량 상소문 — 자동 실행 해제
$taskName = 'Zhuge-Liang-Sangsomun'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host '자동 실행을 해제했습니다. 파일은 그대로 남아 있습니다.'
} else {
  Write-Host '등록된 자동 실행이 없습니다.'
}
