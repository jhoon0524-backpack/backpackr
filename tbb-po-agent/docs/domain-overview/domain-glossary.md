# 도메인 용어집 (Domain Glossary)

> 이 용어집은 docs/domain-overview/ 11개 도메인 문서의 표제어 색인이다. 상세는 각 문서가 SSOT.

---

## 1. 후원자

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 액세스 토큰 | Access Token | 실제 API 요청 시 사용하는 인증 토큰. 만료 1일. 01-user-auth.md 참조 |
| 리프레시 토큰 | Refresh Token | 액세스 토큰 재발급용 토큰. 만료 1년, 발급 후 6개월 경과 시점부터 재발급 신청 가능. 01-user-auth.md 참조 |
| 연락처 점유인증 | Contact Ownership Verification(코드명 불명 — [확인 필요]) | 회원가입·연락처 변경·결제 시 특정 연락처(전화번호)의 배타적 소유를 증명하는 인증. 월 1회(캘린더월 기준) 변경 가능. 점유인증 성립 시 동일 번호를 쓰던 타 계정의 "일반 인증"은 자동 해제. 01-user-auth.md 참조 |
| 일반 인증(연락처) | General Contact Verification(코드명 불명 — [확인 필요]) | 점유인증이 아닌 일반 상태의 연락처 인증. 다른 계정이 해당 번호로 점유인증하면 해제 대상이 된다. 01-user-auth.md 참조 |
| 프로필 URL / 사용자 이름(URL) | User Permalink / `userPermalink` | `tumblbug.com/u/{userPermalink}` 형태의 프로필 접속 경로(PO 확인 2026-07-10). 3~20자, 영문·숫자·`-`·`_`만 허용, 계정 간 중복 불가. 01-user-auth.md 참조 |
| 자기소개 | Short Description / `shortDescription` | 프로필 소개글. 2,500자 이하, 문자 제한 없음(코드 기준). 01-user-auth.md 참조 |
| 아이디어스 주소 | idus URL / `idusUrl` | 텀블벅 자체 프로필 필드로 정당한 표제어(사용자 승인). 외부 "아이디어스" 프로필 페이지 링크. 1개만 등록, `idus.com`/`idus.kr` 도메인만 허용. 01-user-auth.md 참조 |
| 스테디오 주소 | Steadio URL / `steadioUrl` | 외부 "스테디오" 프로필 페이지 링크 — **스테디오 서비스 종료로 미사용**(PO 확인 2026-07-10). 코드엔 필드·검증 로직이 잔존(정리 시점은 엔지니어링 백로그). 01-user-auth.md 참조 |
| 사용자 웹사이트 | User Website / `UserWebsite`(엔티티, `user_websites` 테이블) | 프로필에 다건 등록 가능한 외부 웹사이트 링크. 단건 추가 시 `UpdateProfileDto.websiteUrl`(최대 255자, URL 형식) 사용. 01-user-auth.md 참조 |
| 후원이력 공개 여부 | `User.isOpenPledgeHistory` | 후원자가 후원 이력(프로필 노출)을 공개로 설정했는지 여부. 프로젝트 후원자 프로필 노출 조건의 필수 조건 중 하나. 02-creator.md 참조 |
| 후원 유효 상태 그룹 | `ProjectWarranty.PLEGED_STATES` = `[PLEDGED, CHARGING, PAID, UNPAID]` | 후원(ProjectWarranty)이 "유효 후원"으로 집계되는 상태 집합(코드 확정, 상수명 "PLEGED"는 오타 아닌 실제 상수명). 02-creator.md·05-funding-payment.md 참조 |

---

## 2. 창작자

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 창작자 칭호 | Creator Title(코드명 불명 — [확인 필요]) | 창작자 활동 실적 기반으로 주 1회 배치 산정·부여되는 5종 타이틀. 그룹당 1개, 최대 2개 동시 보유. 02-creator.md 참조 |
| 좋은창작자 뱃지 | Good Creator Badge(코드명 불명 — [확인 필요]) | 칭호 1개 이상 보유한 창작자에게 부여되는 뱃지. 홈/PLP/PDP 프로젝트 노출에 사용. 02-creator.md 참조 |
| 펀딩블루칩 | Funding Blue-chip(칭호 1번, 1번 그룹) | 누적 성사 실적(후원액·후원자수·프로젝트 횟수) 기준 우량 창작자 칭호. 02-creator.md 참조 |
| 트렌드 메이커 | Trend Maker(칭호 2번, 1번 그룹) | 최근 120일 성사 실적 기준 급성장 창작자 칭호. 02-creator.md 참조 |
| 팬덤 파워 | Fandom Power(칭호 3번, 2번 그룹) | 재후원 의향 응답 비중 기준 팬덤 반응 우수 창작자 칭호. 02-creator.md 참조 |
| 신뢰의 아이콘 | Trust Icon(칭호 4번, 2번 그룹) | 프로젝트 계획·이슈 대응 후기 평점 기준 신뢰 창작자 칭호. 02-creator.md 참조 |
| 소통의 대가 | Communication Master(칭호 5번, 2번 그룹) | 소통 관련 후기 응답 점수 기준 소통 우수 창작자 칭호. 02-creator.md 참조 |
| 환산 점수 | Converted Score(코드명 불명 — [확인 필요]) | 후기 응답(-1/1/2점)을 10개 응답 기준으로 정규화한 점수. 칭호 4·5번 발급 판정에 사용. 02-creator.md 참조 |
| 창작생태계 기여도 | Creator Ecosystem Contribution(코드명 불명 — [확인 필요]) | 창작자 활동 기여도를 주 1회 배치로 산정, 랭킹·티어로 노출하는 지표 체계. 02-creator.md 참조 |
| user_contribution_stats | `user_contribution_stats`(테이블명) | 창작생태계 기여도 항목별 카운트를 저장하는 배치 갱신 테이블. 02-creator.md 참조 |
| user_tiers | `user_tiers`(테이블명) | 창작생태계 기여도 랭킹·티어 변화(현재/이전)를 저장하는 배치 갱신 테이블. 02-creator.md 참조 |
| 배송정보 조회 가능 기간 | Shipping Info Access Window | 민감정보(수령인·연락처·주소 등)인 배송정보를 창작자가 조회할 수 있는 제한 기간. 배송 완료 전은 예상전달일+90일, 배송 완료 후는 배송완료일+30일까지만 조회 가능. 07-fulfillment-review.md 참조 |

---

## 3. 프로젝트

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 프로젝트 상태 | `ProjectState` | 프로젝트 생애주기 상태 Enum 14종(draft~ended). 03-project.md 참조 |
| 작성 중 | `DRAFT`/`draft` | 창작자가 편집 중, 심사 요청 전 상태. 03-project.md 참조 |
| 승인요청 됨 | `SUBMITTED`/`submitted` | 창작자가 심사 요청한 상태. 03-project.md 참조 |
| 승인 됨 | `VERIFIED`/`verified` | 심사 통과, 펀딩 시작 가능(STARTABLE) 상태. 03-project.md 참조 |
| 보완 요청 됨 | `REJECTED`/`rejected` | 심사 보완 요청(재요청 가능) 상태. 03-project.md 참조 |
| 반려 됨 | `FINAL_REJECTED`/`final_rejected` | 심사 최종 반려 상태. 03-project.md 참조 |
| 공개예정 중 | `PRELAUNCHED`/`prelaunched` | 펀딩 시작 전 최대 15일 노출되는 공개예정 상태. 03-project.md 참조 |
| 진행 중 | `ONGOING_NOT_REACHED`/`ongoing_not_reached` | 펀딩 진행 중 목표 미도달. 03-project.md 참조 |
| 진행 중/목표 도달 | `ONGOING_REACHED`/`ongoing_reached` | 펀딩 진행 중 목표금액 도달. 03-project.md 참조 |
| 성공(정산 전) | `SUCCEEDED_NOT_BALANCED`/`succeeded_not_balanced` | 마감 시 목표 도달로 성공, 창작자 정산 전. 03-project.md 참조 |
| 성공(정산 후) | `SUCCEEDED_BALANCED`/`succeeded_balanced` | 정산 완료된 성공 프로젝트. 03-project.md 참조 |
| 실패(무산) | `FAILED`/`failed` | 마감 시 목표 미달로 실패, 미청구. 03-project.md 참조 |
| 취소(중단) | `CANCELLED`/`cancelled` | 진행 중 중단된 프로젝트. 03-project.md 참조 |
| 일시 중지 | `PAUSED`/`paused` | 상시 프로젝트 판매 일시중지. 03-project.md 참조 |
| 판매 종료 | `ENDED`/`ended` | 상시 프로젝트 판매 종료. 03-project.md 참조 |
| 상태 전이 이벤트 | `ProjectStateTransitionEvent` | 상태 전이 트리거 14종(go_over_goal 등). 전이 이력은 별도 로그 테이블에 기록. 03-project.md 참조 |
| 프로젝트 타입 | `ProjectType` | funding·preorder·preorder_fancall·preorder_global·store 5종. 03-project.md 참조 |
| 상시 프로젝트 | `STORE` | 즉시결제·다회구매 상시 판매 프로젝트(예약결제 아님). 03-project.md 참조 |
| 팬콜 프로젝트 | Fancall / `PREORDER_FANCALL` | 후원자 요청으로 종료된 프로젝트를 재오픈한 프로젝트. 원본은 "오리지널"이라 부름. 03-project.md 참조 |
| 공개예정 | Prelaunch / `usePrelaunch`·`prelaunchedAt` | 펀딩 시작 전 최대 15일 홍보 노출. PRO·PREMIUM 요금제만 사용 가능. 03-project.md 참조 |
| 책임심사 사전확인서 | Responsibility Review / `ResponsibilityReviewProjectStatus` | 책임심사 대상 창작자의 funding 프로젝트 빠른 심사 제도(제출 시 영업일 1일 내 승인). 상태 3종(NOT_REQUIRED/REQUIRED/SUBMITTED). 03-project.md 참조 |
| 오픈런(선예약) | PreBacking / `PreProjectWarranty`·`PreBackingStatus` | 공개예정 프로젝트 선물을 시작 전 선예약, 시작 시 결과 확정(수량 초과 시 랜덤추첨). 신청상태 5종. 03-project.md 참조 |
| 예상 발송 시작일 | Expected Delivery (Start) Date / `Project.expectedDeliveryDate`(`projects.expected_delivery_date`) | 프로젝트 단위 발송 시작 예정일. "목표 금액 및 일정" 탭에서 창작자가 입력(master)하며, 추천 선물의 예상 발송일이 이 값을 따라간다(단방향). 선물 단위 "예상 전달일"과 별개 필드. 03-project.md 참조 |

---

## 4. 선물

> 도메인 언어는 "선물"이 정식이고 "리워드"는 코드·사내 관용 표기다(엔티티 표제어만 동의어 병기).

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 선물 / 리워드 | Reward / `Reward`(table `rewards`) | 프로젝트에 속한 후원 보상 단위. money·limit(총 한정수량)·userLimit(1인당)·type 보유. 04-reward.md 참조 |
| 기본 선물 / 추가 선물 | Regular / Extra / `RewardType` | 선물 유형 2종: REGULAR(기본 선물), EXTRA(추가 선물). 04-reward.md 참조 |
| 선물 없이 후원 | No-Reward / `Reward.NO_REWARD_*` | reward_id=0, 금액 1,000원의 가상 선물(DB 미저장, 즉석 생성). 실물 전달 불필요. 04-reward.md 참조 |
| 선물 구성 아이템 | Item / `Item`(table `items`) | 선물을 구성하는 개별 아이템. optionType(0 없음/1 주관식/2 객관식)·optionDesc(객관식 선택지, `\n` 구분) 보유. 04-reward.md 참조 |
| 옵션 유형 | Option Type / `Item.optionType` | 아이템 옵션 종류: 0=옵션없음, 1=주관식, 2=객관식. 04-reward.md 참조 |
| 추가 정보(설문) | AddInfo / `AddInfo`(table `addinfos`) | 선물에 붙는 추가 입력 항목(answerType NONE/TEXT/SELECT). 후원 답변은 PurchaseAddInfo에 저장. 04-reward.md 참조 |
| 후원 옵션 스냅샷 | `ProjectWarrantyRewardItem.option` | 후원 시 후원자가 선택·입력한 옵션 값 저장(DB 최대 1,500자). 04-reward.md 참조 |
| 한정 수량 | Limit / `Reward.limit`, `ProjectLimitReward.remainQuantity` | 선물 총 판매 제한 수량(null=무제한). 잔량은 remainQuantity 캐시 + Redis 카운터로 관리. 04-reward.md 참조 |
| 1인당 제한 수량 | User Limit / `Reward.userLimit` | 후원자 1인당 최대 선택 가능 수량(1~1,000). 04-reward.md 참조 |
| 선물 재고 소진 | Sold Out / `Reward.isSoldOut()`, `ErrorCode.END_REWARD` | limit ≤ 후원수. 초과 후원 시 END_REWARD(409). 04-reward.md 참조 |
| 빈자리 알림 | Reward Slot Availability / `RewardSlotAvailabilityNotifierService`, `RewardSlotNotification`, `Reward.slotNotificationCount` | 소진(품절)됐던 한정 선물에 재고가 다시 생기면 신청 후원자 전원에게 앱 푸시. 03-project.md·04-reward.md 참조 |
| 디지털 에셋 | Digital Asset / `DigitalAsset`(table `digital_assets`) | 디지털선물 실체(FILE/TEXT). 유효기간 등록일+1년, 프로젝트당 총 100GB. 04-reward.md 참조 |
| 디지털선물 상태 | `DigitalAssetStatus` | 전달 전(PENDING)·전달 중(PROCESSING)·전달완료(DELIVERED)·전체회수(REVOKED)·기간만료(EXPIRED) 5종. 04-reward.md 참조 |
| 선물 전달 상태 | Reward State / `ProjectWarrantyRewardState`(table 컬럼: `project_warranties.reward_state`) | 후원건별 선물 전달 진행 상태. `STAND_BY(0)`·`INFO_REQUESTED(1)`·`DUMMY(2)`·`RESPONDED(3)`·`DELIVERED(4)`·`REFUNDED(5)` 6종. 07-fulfillment-review.md 참조 |
| 선물 전달 완료 | Delivered / `ProjectWarrantyRewardState.DELIVERED`(value=4) | 창작자가 선물 전달을 완료 처리했거나 후원자가 "받았다"를 확인해 확정된 상태. 후기 작성·배송정보 조회 기간 기산의 기준점. 07-fulfillment-review.md 참조 |
| 받았다고 확인한 날짜 | Delivered At / `project_warranties.delivered_at` | 후원자가 "선물을 받았습니까?" 알림에서 "받았다"를 클릭한 시각. 후기 작성 진입 조건 및 배송정보 조회 30일 기산 기준. 07-fulfillment-review.md 참조 |
| 예상 전달일 | Expected Delivery Date / `rewards.expected_delivery_date` | 선물에 설정된 발송 예정일. 후기 작성 가능 조건(전달 미확정 시 대체 트리거) 및 배송정보 조회 90일 기산 기준. 04-reward.md·07-fulfillment-review.md 참조 |
| 추천 선물 | Recommended Reward / `Reward.recommended` | 프로젝트를 대표하는 선물(REGULAR 중 프로젝트당 1개, '추천' 뱃지 노출). 예상 발송일은 프로젝트 예상 발송 시작일로 자동 덮어써져 개별 편집 불가(단방향 연동). 03-project.md·04-reward.md 참조 |

---

## 5. 펀딩결제

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 예약결제 | Reserved Payment / `ProjectWarrantyState.PLEDGED` | 기간 펀딩에서 후원 시 결제정보만 저장(예약)하고 마감·성공 후 일괄 청구하는 방식(All-or-Nothing). 05-funding-payment.md 참조 |
| 즉시결제 | Immediate Payment / `StoreBackingCreateService` | 상시 프로젝트에서 후원 즉시 결제·선물 배송하는 방식(INIT→PAID). 05-funding-payment.md 참조 |
| 후원(보증) 상태 | `ProjectWarranty` / `ProjectWarrantyState` | 후원 1건의 결제/보증 상태를 나타내는 12값 상태머신(PLEDGED~REFUNDED/INIT). 05-funding-payment.md 참조 |
| 결제 대기 | `CHARGING`(value 5) | 마감·성공 후 청구 배치 대상이 된 상태(PLEDGED→CHARGING). 05-funding-payment.md 참조 |
| 결제 재시도 중 | `UNPAID`(value 3) | 청구 실패로 7일간 재시도 중인 상태. 05-funding-payment.md 참조 |
| 결제 누락 | `DROPPED`(value 4) | 7일간 청구 최종 실패 상태(선물 수령 불가). 05-funding-payment.md 참조 |
| 결제수단 | `PaymentType` | 카드(0)/계좌(1)/네이버페이(2)/간편결제(3)/카카오페이(4). 05-funding-payment.md 참조 |
| 간편결제 | `PaymentType.IAMPORT`(3) | 아임포트 채널 경유 결제(카카오페이·토스페이 등). 05-funding-payment.md 참조 |
| 아임포트 PG채널 | `PgProvider` | 아임포트 하위 PG 구분(kakaopay/tosspay). 05-funding-payment.md 참조 |
| 후원 결과 타입 | `FundType` | 후원의 최종 결제 결과(pledged/paid/dropped/refunded/pledged_not_charged). 05-funding-payment.md 참조 |
| 후원 결제 배치 | `backingPaymentJob` | 네이버페이→간편결제→카드 순차 청구 배치(계좌 제외). 05-funding-payment.md 참조 |
| 결제 누락 처리 배치 | `DropPaymentRejectedPledgesService` | 7일 청구 실패 후원을 DROPPED로 일괄 전이하는 배치. 05-funding-payment.md 참조 |

---

## 6. 정산

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| (창작자) 정산 | Settlement / `Settlement*` | 펀딩 성공 확정 또는 상시 판매 확정 후 창작자에게 정산금을 지급하는 절차. 펀딩·상시 두 파이프라인 존재. 06-settlement.md 참조 |
| 펀딩 정산 | Funding Settlement / `settlement.funding` | 프로젝트 단위·All-or-Nothing 후속 배치 정산. 결제 종료일+7영업일에 자동 실행. 06-settlement.md 참조 |
| 상시 프로젝트 정산 | Store Settlement / `settlement.store` | 상시 프로젝트의 월별·창작자별 집계 정산. 어드민 확정(FIXED) 후 자동이체. 06-settlement.md 참조 |
| 서비스 수수료 | Tumblbug/Service Fee / `RatePlanType.commissionRate` | 텀블벅이 창작자에게 받는 **정산 수수료율**(SNS 광고 수수료율과는 별개 축). 요금제별 START 5%·RUN 9%·BOOST 15%. 06-settlement.md·11-adcenter.md §3-6 참조 |
| 결제 수수료 | Payment/Charge Fee / `chargeFee`·`paymentFeeAmount`(정산 계산식), `WithdrawResult.commission`(결제수단별 기록값) | 정산 시 모금액에서 차감되는 PG 결제 처리 수수료. 정산 계산식 기준 요금제 무관 3% 고정, 결제수단별 실제 기록값은 카드 2.4~2.8%·네이버페이 2.4%·간편결제 2.5%. 05-funding-payment.md·06-settlement.md 참조 |
| 예치 수수료 | Deposit Fee / `depositFee` | 정산금 예치·송금 관련 수수료. 현행(payoutVersion≥4) 0원. 06-settlement.md 참조 |
| 후불광고 차감액 | Postpaid Ad Amount / `postpaidAdAmount` | 후불 집행 광고비를 정산 시 모금액에서 차감하는 금액. 06-settlement.md 참조 |
| 수수료 요금제 | Rate Plan / `RatePlanType` | 창작자가 선택하는 요금제. 대외 명칭 START·RUN·BOOST(+DEFAULT 폴백) / 코드 Enum은 BASIC·PRO·PREMIUM 유지. 06-settlement.md 참조 |
| START (요금제) | 코드: `RatePlanType.BASIC` | 서비스 수수료 5%. 구 대외 명칭 BASIC. 06-settlement.md 참조 |
| RUN (요금제) | 코드: `RatePlanType.PRO` | 서비스 수수료 9%. 구 대외 명칭 PRO. 상시 프로젝트 신규 생성 시 기본값. 06-settlement.md 참조 |
| BOOST (요금제) | 코드: `RatePlanType.PREMIUM` | 서비스 수수료 15%. 구 대외 명칭 PREMIUM. 06-settlement.md 참조 |
| MOU 예외 요율 | Custom/Project Commission / `ProjectCommission` | 협약 프로젝트에 어드민이 등록하는 개별 요율. 선택 요금제보다 우선 적용. 06-settlement.md 참조 |
| 조건부 수동 분할 정산 | Two-Phase Payout / `PayoutType.TWO_PHASE` | 정산을 1·2차로 나눠 일부 선지급하는 제도. 2차는 AUTO 또는 MANUAL(운영자 지정일). 06-settlement.md §3-B 참조 |
| 정산일 | Balance/Settlement Date / `balanceDate` | 정산이 실행되는 날. 펀딩=결제종료일+7영업일. 06-settlement.md 참조 |
| 정산 스케줄 | Settlement Schedule / `SettlementSchedule` | 상시 정산의 월별 배치 단위. 8단계 상태머신. 06-settlement.md 참조 |
| 정산 요약 | Settlement Summary / `SettlementSummary` | 상시 정산의 창작자별·월별 정산금 요약(납세자·계좌 정보 포함). 06-settlement.md 참조 |
| 정산 명세 | Settlement Detail / `SettlementDetail` | 상시 정산의 후원 건별 정산 내역(REWARD·EXTRA_BACKING). 06-settlement.md 참조 |
| 정산 확정 | Fixed / `State.FIXED` | 상시 정산 데이터를 어드민이 확정한 상태. 이후 자동이체 진행. 06-settlement.md 참조 |
| 세금계산서 | Tax Invoice / `TaxInvoiceGenerateTask` | 사업자 창작자 대상 발행 문서. 개인/법인사업자(TaxpayerType) 구분. 06-settlement.md 참조 |
| 정산명세서 | Creator Report / `CreatorReportGenerateTask` | 창작자에게 제공하는 정산 내역 문서. 06-settlement.md 참조 |
| 응원권 | Creator Coupon / `creatorCouponAmount` | 후원 시 차감되는 쿠폰. 정산 시 선물 건별 비례 배분. 06-settlement.md 참조 |
| 자동이체(정산 송금) | Settlement Transfer / `SettlementTransfer` | 상시 정산금 이체 요청·응답 기록. 수취인 TUMBLBUG/CREATOR. 06-settlement.md 참조 |

---

## 7. 취소환불

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 취소(미결제) | Cancel / `ProjectWarrantyCancelType.CANCEL` | 결제 전 후원 취소. 창작자 승인 없이 자동 승인. 08-cancel-refund.md 참조 |
| 환불(결제후) | Refund / `ProjectWarrantyCancelType.REFUND` | 결제 이후 취소. 창작자(또는 기한초과 자동) 승인이 필요. 08-cancel-refund.md 참조 |
| 취소·환불 처리상태 | `ProjectWarrantyCancelStatus` | 취소/환불 건의 상태: 요청(REQUESTED)/거부(REJECTED)/승인(APPROVED). 08-cancel-refund.md 참조 |
| 취소·환불 사유 | `ProjectWarrantyCancelReasonType` | 단순변심/주문실수/파손및불량/오배송·구성품누락 4종. 전달 전이거나 상시 프로젝트면 앞 2종만 노출. 08-cancel-refund.md 참조 |
| 환불 처리 마감기한 | processingDueDate | 창작자가 환불 요청을 승인/거절해야 하는 기한. 결제후 요청 시 +7일, 초과 시 배치가 자동 승인. 08-cancel-refund.md 참조 |
| 환불 요청중 | `ProjectWarrantyState.REFUND_REQUESTED`(7) | 후원자가 결제후 환불 요청, 창작자 승인 대기 상태. 08-cancel-refund.md 참조 |
| 환불 거절 | `ProjectWarrantyState.REFUND_REJECTED`(8) | 창작자가 환불 요청을 거절한 상태(환불 불가). 08-cancel-refund.md 참조 |
| 환불중 | `ProjectWarrantyState.REFUND_PROCESSING`(9) | 환불 승인 후 PG 환불이 진행 중인 상태. 08-cancel-refund.md 참조 |
| 환불 완료 | `ProjectWarrantyState.REFUNDED`(10) | PG 환불이 확정된 상태. 08-cancel-refund.md 참조 |
| 결제 전 취소 | `ProjectWarrantyState.PLEDGED_NOT_CHARGED`(6) | 프리오더 성사 후 결제 전 취소된 상태(자동 승인). 08-cancel-refund.md 참조 |
| 밀어주기 취소 | `ProjectWarrantyState.CANCELLED`(1) | 진행중 미결제 취소 / 상시 즉시결제 취소의 종착 상태. 08-cancel-refund.md 참조 |
| 취소·환불 이력 | `ProjectWarrantyCancel` | 후원 1건의 취소/환불 요청 레코드(사유·상태·기한·이미지 첨부). 08-cancel-refund.md 참조 |
| 프리오더 환불 자동승인 배치 | `PreorderRefundAutoApproveJob` | 승인기한 초과된 프리오더 환불 요청을 자동 승인·환불하는 배치(매일 00:10, 카드·네이버페이·IAMPORT만). 08-cancel-refund.md 참조 |
| 환불교환 정책 | `RefundExchangePolicy` | 창작자가 프로젝트에 등록하는 환불·교환 안내문/리스크 고지 텍스트(금액 계산 아님). 08-cancel-refund.md 참조 |
| 오픈런 강제취소 | `AdminPreBackingCancelService` | 공개예정 프로젝트의 오픈런(사전신청) 후원을 어드민이 일괄 강제 취소(실후원 전, 결제·환불 무관). 08-cancel-refund.md 참조 |

---

## 8. 탐색

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 히어로 | Hero(admin: `/nadmin/heroes`) | 홈 최상단 배너 영역. 관리자 등록 글의 타이틀·본문·이미지·연결 URL을 `is_featured` 기준으로 노출. 09-discovery.md 참조 |
| 큐레이션 | Curation | 홈 화면에서 신규·인기·마감임박·공개예정 등 규칙 기반으로 프로젝트를 묶어 보여주는 섹션 그룹. 09-discovery.md 참조 |
| 콜렉션(기획전) | Collection(admin: `/nadmin/collections`) | 운영이 프로젝트를 수동 큐레이션해 배너·전용 페이지로 노출하는 기획전 단위. `is_featured`·`is_public`·`Sort`로 노출 제어. 09-discovery.md 참조 |
| 둘러보기 | Discover(`tumblbug.com/discover`) | 필터·소팅을 적용해 프로젝트 목록을 탐색하는 페이지. 09-discovery.md 참조 |
| 에디터 추천 | Editor's Pick(코드명 불명확 — [확인 필요]) | 운영이 수동 선정한 프로젝트 플래그. 추천·큐레이션·필터 로직에서 공통 조건으로 반복 사용. 09-discovery.md 참조 |
| 인기순 | Popular sort | 진행상태→지난24h후원수→지난1주후원수→달성률→알림신청수→마감일→금액→목표금액 순 정렬(둘러보기 기본 소팅). 09-discovery.md 참조 |
| 추천순 | Recommend sort | 카테고리/공개예정 속성별로 후원수·알림신청수 가중치를 다르게 적용하는 소팅(2023.04.12 배포). 09-discovery.md 참조 |
| 마감임박순 | Deadline-soon sort | 진행상태 우선 정렬 후 마감일 오름차순(동률 시 인기순)으로 정렬하는 소팅. 09-discovery.md 참조 |
| 알림신청(수) | Notification subscription count | 공개예정 프로젝트의 오픈 알림 신청 건수. 공개예정 정렬·추천 로직의 핵심 기준값. 09-discovery.md 참조 |
| 둘러보기 진행상태 버킷 | Discovery State Bucket | `ProjectState` 14종을 탐색 정렬·필터용으로 재매핑한 4개 그룹(진행중/공개예정/성사/무산). 상태 값 자체의 SSOT는 프로젝트 상태(`ProjectState`) 참조. 03-project.md·09-discovery.md 참조 |

---

## 9. 커뮤니티알림

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| UGC | User Generated Contents | 업데이트 글/댓글, 커뮤니티 글/댓글, 후기 글/댓글, 메시지를 포괄하는 사용자 생성 콘텐츠. 10-community-notification.md 참조 |
| 신고 검토 필요 | `REVIEW_NEEDED`(ContentReportManagementStatus) | UGC 신고 접수 시 최초 부여되는 상태. 이 상태에서 신규 신고가 누적되면 자동 숨김 판정 대상이 됨. 10-community-notification.md 참조 |
| 자동 숨김 | `AUTO_HIDDEN`(ContentReportManagementStatus) | REVIEW_NEEDED 상태에서 신규 신고가 누적 6건째(AUTO_HIDE_THRESHOLD=6) 도달 시 시스템이 자동으로 컨텐츠를 숨김 처리한 상태. 10-community-notification.md 참조 |
| 창작자/후원자 Pick 후기 | Creator/Backer Pick Review | 창작자 또는 후원자가 특정 후기를 대표 후기로 선정해 노출을 강조하는 기능. 프로젝트 1개당 최대 2개까지 선정 가능. 07-fulfillment-review.md 참조 |
| 마케팅 푸시 동의 유도 모달 | (코드명 불명확 — [확인 필요]) | 마케팅 푸시 미동의 유저가 특정 액션(후원완료 등)을 최초 수행 시 노출되는 동의 유도 모달. 거부 시 30일 유예 후 재노출. 10-community-notification.md 참조 |
| 시스템 푸시 설정 유도 모달 | (코드명 불명확 — [확인 필요]) | 시스템 알림 비활성 유저가 특정 액션(팔로우 등)을 최초 수행 시 노출되는 설정 유도 모달. 비허용 시 100일 유예 후 재노출. 10-community-notification.md 참조 |
| 앱 알림 뱃지(숫자) | (코드명 불명확 — [확인 필요]) | 앱 아이콘/알림 탭에 표시되는 {신규 알림수}+{안 읽은 메시지 수} 합산 숫자. 10-community-notification.md 참조 |

---

## 10. 광고센터

| 한국어명 | 영문명 / 코드명 | 설명 |
|---------|----------------|------|
| 비즈머니 | BizMoney / `UserCredit` | 창작자가 광고센터에서 광고 상품 결제 시 사용하는 선충전금. 계정 기준 관리, 충전일로부터 5년 유효. 11-adcenter.md 참조 |
| 비즈머니 계정 상태 | `UserCreditState` | 비즈머니 충전 건별 상태. `PENDING`(결제대기)·`ACTIVE`(사용가능)·`EXPIRE`(만료)·`REFUNDED`(환불완료)·`CONSUMED`(전액소진) 5종. 11-adcenter.md 참조 |
| 비즈머니 환불 | Credit Refund / `CreditRefundService` | 창작자가 충전한 비즈머니(미소진분)를 되돌려받는 것. 후원 취소·환불(08-cancel-refund.md)과는 별개 계통. 결제취소 가능기간(1년) 이내는 전액 결제취소, 경과 후는 수수료 3% 제외한 계좌 개별입금. 11-adcenter.md 참조 |
| 비즈머니 환급 | Ads Refund | 광고 상품 취소·종료 시 소진 비용을 제외한 잔액을 비즈머니로 되돌려주는 것. "환불"과 구분되는 별도 용어(환불=충전금 회수, 환급=광고 취소분 반환). 11-adcenter.md 참조 |
| 결제 취소 가능 기간 | Cancel Period / `UserCredit.CANCEL_PERIOD_DAYS` | 비즈머니 충전 건을 수수료 없이 카드결제 취소할 수 있는 기간. 충전일로부터 365일(1년). 11-adcenter.md 참조 |
| SNS 광고 수수료율 | Ads Product Commission / `AdsProductCommission` | SNS 셀프 광고 결제 시 부과되는 요금제별 서비스 수수료. **정산 수수료율(서비스 수수료, 06-settlement.md)과 저장 위치·용도가 다른 별개 값** — START 15%·RUN 10%·BOOST 0%(면제, 2025-05-23 기준). 11-adcenter.md 참조 |
| SNS 셀프 광고 | SNS Self Ads / MPA(Meta Paid Ads) | 창작자가 직접 예산·소재를 세팅해 텀블벅 메타 계정으로 집행하는 메타(페이스북/인스타그램) 광고 서비스. 현재 메뉴 제거로 이용불가(재오픈 미정). 11-adcenter.md 참조 |
| 캠페인 상태 | `AdsOrderStatus` | SNS 셀프 광고 캠페인의 8단계 상태: `SUBMITTED`(심사중)·`TUMBLBUG_VERIFIED`(심사중)·`VERIFIED`(승인)·`REJECTED`(반려)·`ONGOING`(광고중)·`ENDED`(종료)·`CANCELLED`(취소)·`ABORTED`(중단). 11-adcenter.md 참조 |
| 광고 유효 상태 | `AdsEffectiveStatus` | 광고그룹·소재의 실질 노출 상태를 상위 캠페인 상태까지 반영해 계산한 값. 9종(캠페인 상태 8종 + `CAMPAIGN_ABORTED`). 11-adcenter.md 참조 |
| 광고 결제 상태 | `AdsPaymentStatus` | SNS 셀프 광고 결제 건의 상태. `PENDING`(대기)·`SUCCESS`(완료)·`CANCELLED`(취소)·`PART_CANCELLED`(부분취소)·`FAILED`(실패)·`RETURNED`(환불) 6종. 11-adcenter.md 참조 |
| 일예산 프리셋 | `MpaOptionCode` | SNS 셀프 광고 캠페인 생성 시 선택하는 일예산 옵션. `AGGRESSIVE`(공격적)·`RECOMMENDED`(추천)·`ECONOMICAL`(경제적)·`CUSTOM`(직접설정) 4종. 노션의 15만/8만/3만/직접입력 프리셋과 대응하는 것으로 추정(정확한 금액 매핑은 DB 시드 데이터라 미확정). 11-adcenter.md 참조 |
| 소진 비용 | Consumed Cost | SNS 셀프 광고 집행 중 실제로 사용된 비용. 메타 광고비 + 광고 수수료(요금제별) + VAT 포함 금액. 환급액 계산의 차감 기준. 11-adcenter.md 참조 |
| 보증금 | Ads Deposit | SNS 셀프 광고 결제 시 예상보다 많은 소진에 대비해 예치하는 금액. 캠페인 총 예산의 5%, 사용 후 잔액 환급. 11-adcenter.md 참조 |
| 텀블벅 유저 그룹 | Tumblbug User Adset | SNS 셀프 광고 캠페인의 자동 세팅 광고그룹. 최근 180일 내 후원자 중 최근 7일 방문·30일 후원자를 제외한 타겟. 11-adcenter.md 참조 |

---

> **마지막 업데이트**: 2026-07-15 (예상 발송 시작일·추천 선물 표제어 추가; sync 자동화는 Phase 4+ 도입 예정)
