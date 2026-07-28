# booking-core

미팅 예약 링크 v1의 **호스트 코드베이스에 의존하지 않는 부분**. 스펙은 [handoff.md](../docs/prd/handoff.md).

```
gradle test
```

## 왜 별도 모듈인가

이 저장소에는 텀블벅 서비스의 `core`/`api`/`admin` 모듈이 없다. 기존 알림 모듈·admin 세션 인증·암호화 유틸·tumblbug-ui가 전부 그쪽에 있어서, 핸드오프가 "재사용한다"고 정한 것들을 여기서 가져다 쓸 수 없다.

그래서 **프레임워크 없이 검증되는 것만** 먼저 짰다. 슬롯 계산은 문서가 "여기서 어긋나면 이중 부킹이 난다"고 못박은 자리이고, 순수 로직이라 옮겨 붙일 때 그대로 간다.

## 들어 있는 것

| 파일 | 대응 |
|---|---|
| `db/booking.sql` | handoff 2장 DDL |
| `SlotCalculator` | handoff 4장 — 후보 생성 · 리드타임 · 점유 구간 제외 |
| `CancelPolicy` | 예약자 취소 2시간 규칙 |
| `BookingPage` · `BusyPeriod` | 계산에 필요한 값만. 엔티티가 아니다 |

`BusyPeriod`에 겹침 판정 메서드를 두지 않았다. 코드 사다리 3단에서 Interval·Range 클래스를 만들지 않기로 했고, 판정 코드가 두 벌이면 한쪽만 고치는 실수가 난다. 겹침은 `SlotCalculator` 한 곳에서만 본다.

## 아직 없는 것 — 호스트에 붙일 때 채운다

- **JPA 엔티티·리포지토리** — 호스트의 `BaseEntity` 관례를 모른 채 찍으면 두 번 일하게 된다. DDL이 있으니 그쪽 관례대로 매핑하면 된다.
- **구글 캘린더 클라이언트** — HTTP 5개 호출. 호스트의 HTTP 클라이언트를 쓴다 (SDK 미사용, 코드 사다리 5단).
- **예약 확정·취소 트랜잭션** — `@Transactional` 경계와 `DuplicateKeyException` → 409 매핑. 여기서 검증할 수 없는 부분이다.
- **메일 발송** — 기존 알림 모듈 재사용. 발송기를 새로 만들지 않는다.
- **엔드포인트 13개** — 공개 4개는 인증 없음, `/admin/**`은 기존 admin 세션.

## 옮길 때 확인할 것

`SlotCalculator.availableSlots()`가 받는 `activeBookings`는 **`canceled_ref = 0`인 예약의 `start_at`만** 넘겨야 한다. 취소된 예약까지 넘기면 슬롯이 영영 열리지 않는다.

`now`는 호출부에서 KST 로컬 시각으로 넘긴다. 계산기 안에서 타임존 변환을 하지 않는다.
