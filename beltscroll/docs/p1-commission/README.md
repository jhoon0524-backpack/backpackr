# 윤무겸 샘플 6칸 — 정식 아트 발주 준비 자료 (한곳 모음)

상태 (2026-10-28): **발주 전 오너 승인 대기.** 계약·비용 지출은 하지 않았다.

| # | 오너 지시 항목 | 자료 |
|---|---|---|
| 1 | 아티스트에게 줄 최종 작업 명세서 | `../p1-art-commission-spec.md` |
| 2 | 공식 설정화·참고 이미지 목록 | `references.md` + 03 부분 확대 `ref-03-3view.png` · `ref-03-face.png` · `ref-03-colors.png` · `ref-03-gear.png` · `ref-03-battle.png` |
| 3 | 6개 동작별 자세와 기준점 | `poses.md` + `pose-guide.png` |
| 4 | 색상 팔레트 | `palette.png` · `palette.gpl` (GIMP·Aseprite 에서 불러오기) |
| 5 | PNG·원본 편집 파일·프레임 매핑 납품 규격 | 명세서 6절 + `sample-frames.json` (칸 이름표 양식) |
| 6 | 수정 요청과 승인 기준 | 명세서 7절 |
| 7 | 권리·라이선스 확인 사항 | 명세서 8절 |
| 8 | 견적 요청 설명문 | `quote-request.md` (한국어 + 영어 요약) |
- 예상 작업량(어림): 명세서 9절 — 샘플 6칸 약 9~18시간 + 수정 약 30%.
- 칼끝 56px 검증: `../p1/tip56-check.png`, 도구 `tools/p1-draft/tip56-check.js`.
- 다시 만들기: `node tools/p1-draft/commission-pack.js` (자세 가이드·팔레트·03 부분 확대).

## 아티스트에게 보낼 묶음
- 견적 단계: `quote-request.md` 설명문 + 명세서 + 이 폴더의 `references.md`·`poses.md`·`pose-guide.png`·`palette.png`·`ref-03-*.png` (설정화 부분 확대만).
- 계약(또는 비밀유지 합의) 뒤: 위 + `palette.gpl`·`sample-frames.json` + 03·06·07 원본 PNG 3장(`assets/reference/png-originals/`). — 2026-10-28 오너 결정: 이 순서 (원본은 계약 또는 비밀유지 합의 뒤).
- 내부 자료(`docs/p1-density.md` 등 비교 보고, `tests/`)는 보내지 않아도 된다.
