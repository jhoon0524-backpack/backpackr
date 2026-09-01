# Dropbid 네이티브 앱 (Expo / React Native)

웹(`../dropbid`)과 **같은 서버·같은 DB·같은 규칙**을 쓰는 네이티브 앱이다.

## 왜 이 구조인가 — 앱이 Supabase 에 직접 붙지 않는다

앱은 우리 서버의 API 를 거친다. 두 가지 때문이다.

1. **쓰기 함수를 휴대폰이 못 부른다.** `place_bid` · `approve_product` · `reject_product` 는
   `anon` 과 `authenticated` 에게서 실행 권한이 회수돼 있다 (`lock_write_paths` 마이그레이션).
   일부러 잠근 것이다 — 이 함수들은 "누가 하는지" 를 파라미터로 받기 때문에,
   아무나 부를 수 있으면 남의 이름으로 입찰이 된다.
2. **목록에 판매자 이름이 필요한데** `profiles` 는 로그인한 사람만 볼 수 있다 (RLS).

길을 둘로 나누면 규칙도 두 벌이 된다. 하나로 둔다.

```
앱 ──► /api/auctions        ──► lib/db.ts ──► Postgres (규칙은 여기 DB 함수에)
웹 ──► 서버 컴포넌트/액션 ──►
```

## 지금 되는 것 / 안 되는 것

| | 상태 |
|---|---|
| 회차 목록 보기 | **된다** |
| 상품 상세 보기 | **된다** |
| 남은 시간 (서버 시각 보정) | **된다** |
| 마감된 경매 결과·결제 기한 | **된다** |
| **입찰·상품 등록·검수** | **안 된다 — 로그인이 먼저다** |

입찰을 열려면 서버가 "누가 부르는지" 를 알아야 한다. 지금 웹의 사용자 전환은
쿠키에 id 를 담는 시연용 장치라, 그대로 앱에 열면 아무나 남의 이름으로 입찰할 수 있다.
**카카오 로그인이 붙은 뒤** 여는 것이 순서다.

## 띄우기

```bash
# 1) 서버 (다른 창에서)
cd ../dropbid && npm run db:reset && npm run db:seed && npx next build && npx next start -p 3100

# 2) 앱
npm install
npm run web        # 브라우저에서 확인 (react-native-web)
npm run ios        # 시뮬레이터 (macOS 필요)
npm run android    # 에뮬레이터
```

붙을 서버 주소는 `EXPO_PUBLIC_API_BASE` 로 바꾼다. 없으면 개발은 `127.0.0.1:3100`
(안드로이드 에뮬레이터는 `10.0.2.2:3100`), 배포는 Vercel 주소를 본다.

## 이 환경에서의 한계

- `npx expo install` 은 Expo API 로 나가는데 **프록시가 막는다(403).** 패키지는
  `npm install` 로 판을 직접 지정해 넣었다.
- 시뮬레이터를 못 띄운다. 확인은 `react-native-web` 으로 브라우저에서 했다.
  **실제 기기의 글꼴·터치·그림자는 다를 수 있다.**

## 색과 문구는 웹과 같은 값을 쓴다

`src/theme.ts` 는 `dropbid/app/globals.css` 와 같은 텀블벅 토큰이고,
`src/format.ts` 는 `dropbid/lib/format.ts` 와 같은 규칙이다 (오전·오후를 직접 만든다 —
`Intl` 에 맡기면 판올림에 따라 한국어 자리에 AM/PM 이 나온다).
**두 벌로 갈라지면 곧 서로 다른 서비스처럼 보인다.**
