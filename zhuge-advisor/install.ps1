# 제갈량 상소문 — 자동 실행 등록
# 매일 오전 7시, 그리고 윈도우에 로그인할 때마다 상소문을 기본 브라우저로 연다.
# 7시에 컴퓨터가 꺼져 있었으면 다음에 켰을 때 바로 연다 (StartWhenAvailable).

$ErrorActionPreference = 'Stop'
$html = Join-Path $PSScriptRoot 'sangsomun.html'
if (-not (Test-Path $html)) { Write-Host "sangsomun.html 파일이 같은 폴더에 없습니다: $html"; exit 1 }

$taskName = 'Zhuge-Liang-Sangsomun'
$action   = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c start "" "' + $html + '"')
$daily    = New-ScheduledTaskTrigger -Daily -At 7:00am
$logon    = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $daily,$logon -Settings $settings -Force | Out-Null

Write-Host ''
Write-Host '등록되었습니다.'
Write-Host ' - 매일 오전 7:00'
Write-Host ' - 윈도우에 로그인할 때마다'
Write-Host ' - 7시에 꺼져 있었으면 다음에 켰을 때'
Write-Host ''
Write-Host '지금 바로 한 번 엽니다.'
Start-Process $html
