# Code Map — 기능→repo→코드경로 역색인

코드를 여는 **모든 작업의 공통 입구**. 매핑이 있으면 직행, 없으면 `docs/projects.md`·`docs/local-paths.md`로 후보를 좁혀 `sources/`에서 탐색한 뒤 **여기에 등재**한다(자가학습 루프).

> 접근: `sources/{be-api,android,ios,fe,fe-admin}` 로컬 클론(심링크/디렉토리). **be-api-legacy 제외.**
> be-api(tumblbug-api-v2) 멀티모듈: `api`·`admin`·`batch`·`core`·`gateway`. 아래 file:line의 base는 각 모듈의 `src/main/java/com/tumblbug/be/`(`...`로 축약).
> fe는 pnpm 모노레포 — `apps/tumblbug-web`(기존 웹: 에디터·홈·검색·프로필·스튜디오)과 `apps/next-web`(신규 Next.js: 후원자 관리 콘솔 등)이 병존. fe·fe-admin 경로는 repo 루트 기준.
> **라인 기준**: be-api 커밋 401a680d1 (2026-07-10) · fe 커밋 297952486 (v3.49.8, 2026-07-13) · fe-admin 커밋 9b8eb155c (v1.6.6, 2026-07-13). sources/는 활성 개발 트리라 라인이 변동한다 — **파일 경로·심볼명이 1차 키**이고 라인은 기준 커밋 시점의 힌트. 라인 검증은 `git -C sources/{repo} show {기준커밋}:{path}` 로 한다(be-api 신규 행 일부는 "현재 트리 기준"으로 별도 표기).

## 역색인 (도메인별, file:line)

Phase 2 도메인 그라운딩 작성 시 대조한 코드 확정 결과(`tmp/phase2/*-analysis.md` §3)를 도메인별로 구획해 등재. 코어 5종(03·04·05·06·08)은 전수, 미러 6종(01·02·07·09·10·11)은 §3에 file:line이 기록된 항목만.

### 03 프로젝트 (생애·상태·공개예정·오픈런·빈자리)

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 프로젝트 상태 Enum(14종) | be-api | `core/.../type/ProjectState.java:8-23` | draft·submitted·verified·rejected·final_rejected·cancelled·failed·ongoing_not_reached·ongoing_reached·succeeded_not_balanced·succeeded_balanced·prelaunched·paused·ended + 한글 title |
| 프로젝트 상태 그룹 상수 | be-api | `core/.../type/ProjectState.java:50-135` | STARTABLE=verified,prelaunched / SUCCEEDED=~not_balanced,~balanced / STORE_ALL=draft,ongoing_reached,paused,ended 등 |
| 상태 전이 이벤트 Enum(14종) | be-api | `core/.../type/ProjectStateTransitionEvent.java:7-20` | user_submit·start·end_with_success·admin_verify·end_with_failure·go_over_goal·fall_under_goal·admin_reject·end_with_cancel·complete_balance·revert_balance·forcely_rejected·open_store·pause_store |
| 상태 전이 로그 엔티티 | be-api | `core/.../entity/ProjectStateTransition.java:20-49` | `project_state_transitions`(event,from,to) |
| 진행 중 목표 교차 전이 | be-api | `api/.../service/ProjectService.java:454-480` | 모금액≥목표 → not_reached→reached(go_over_goal) / 모금액<목표 → reached→not_reached(fall_under_goal) |
| 마감 전이(실패) | be-api | `batch/.../job/service/UpdateStateOnEndDateService.java:228-232` | ongoing_not_reached → failed |
| 마감 전이(성공) | be-api | `batch/.../job/service/UpdateStateOnEndDateService.java:262-266` | ongoing_reached → succeeded_not_balanced |
| 정산 완료 전이 | be-api | `core/.../entity/Project.java:1339-1347` | succeeded_not_balanced → succeeded_balanced |
| 펀딩 시작 전이 | be-api | `core/.../entity/Project.java:1593-1597` | updateStateToStart → ONGOING_NOT_REACHED (STARTABLE=verified·prelaunched) |
| 상시 오픈/중지 전이 | be-api | `core/.../entity/Project.java:1599-1608,1610-1613` | startStoreProject → ONGOING_REACHED / pauseStoreProject → PAUSED |
| 프로젝트 타입 Enum(5종) | be-api | `core/.../type/ProjectType.java:5-11` | FUNDING·PREORDER·PREORDER_FANCALL·PREORDER_GLOBAL·STORE |
| 프로젝트 타입 그룹 상수 | be-api | `core/.../type/ProjectType.java:13-27` | PREORDER_TYPE_LIST=[PREORDER,PREORDER_FANCALL,PREORDER_GLOBAL] / TYPES_WITHOUT_STORE(4종, STORE 제외) / ALL_TYPES(5종) / isPreorder()=PREORDER_TYPE_LIST.contains(this) |
| 기간 펀딩 vs 상시 구분 | be-api | `core/.../entity/Project.java:1654-1663` | STORE는 expectedPaymentDate=null(즉시결제), 그외 endDate+1일 |
| 공개예정 사용조건 | be-api | `core/.../entity/Project.java:1037-1040` | VERIFIED + RatePlanType.EXCEPT_BASIC(PRO·PREMIUM) |
| 요금제 Enum | be-api | `core/.../type/RatePlanType.java:8-11,20` | BASIC(5%)·PRO(9%)·PREMIUM(15%)·DEFAULT(5%); EXCEPT_BASIC=[PRO,PREMIUM] |
| 공개예정 기간 | be-api | `core/.../entity/Project.java:1080-1082,1087-1089` | getPrelaunchDate()=prelaunchedAt or openedAt-15일(1080-1082); getPrelaunchEndDate()=openedAt(1087-1089) |
| 공개예정 전이 | be-api | `core/.../entity/Project.java:1615-1622` | updateStateToPrelaunch → PRELAUNCHED, prelaunchedAt=now |
| 예약형 공개예정 전이 | be-api | `core/.../entity/Project.java:1625-1629` | reserveStateToPrelaunch — state 변경 없이 plannedAt/prelaunchedAt만 예약 저장, 실제 전이는 배치가 prelaunched 등록 시점에 처리 |
| 책임심사 상태 Enum(3종) | be-api | `api/.../type/management/ResponsibilityReviewProjectStatus.java:3-6` | NOT_REQUIRED·REQUIRED·SUBMITTED |
| 책임심사 대상 판정 | be-api | `api/.../service/v3/project/management/ResponsibilityReviewService.java:17-19` | isFunding + creator Is Active=true |
| 책임심사 제출 판정 | be-api | `api/.../service/v3/project/management/ResponsibilityReviewService.java:21-23` | projectId 제출 레코드 존재 |
| 책임심사 상태 계산 | be-api | `api/.../service/v3/project/management/ViewEditorV2Service.java:110-114` | 대상X→NOT_REQUIRED / 대상+제출→SUBMITTED / 대상+미제출→REQUIRED |
| 오픈런(선예약) 신청 상태 Enum(5종) | be-api | `core/.../type/PreProjectWarrantyStatus.java:7-15` | APPLIED·INVALID·SUCCEEDED·CANCELLED·FAILED |
| 오픈런 프로젝트 상태 Enum(2종) | be-api | `core/.../type/management/PreBackingStatus.java:3-5` | APPLIED·NOT_APPLIED |
| 오픈런 신청/취소 API | be-api | `api/.../controller/PreBackingController.java:41-83` | POST /projects/{uuid}/pre-backings, PUT /pre-backings/{uuid}/cancel |
| 오픈런 취소 조건 | be-api | `api/.../service/PreBackingService.java:126-127` | 프로젝트 state==PRELAUNCHED만 취소 가능 |
| 오픈런 중복 방지 | be-api | `api/.../service/PreBackingService.java:71-72` | 기존 신청 non-CANCELLED면 ALREADY_EXIST_PRE_BACKING |
| 빈자리 알림 발송 | be-api | `api/.../service/v3/reward/RewardSlotAvailabilityNotifierService.java:35-56` | 선물 soldOut 해제 + defaultReward 제외 → MQ push |
| 빈자리 알림 신청 API | be-api | `api/.../controller/v2/reward/RewardSlotNotificationController.java` | v2 |
| 팬콜 투표 성과 기준 상수 | be-api | `batch/.../job/service/UpdateIsRequestFancallAvailableService.java:43-44` | LEAST_BACKING_MONEY=5,000,000 / LEAST_BACKING_COUNT=100 (private static final) |
| 프로젝트 예상 발송 시작일 필드 | be-api | `core/.../entity/Project.java:522`(필드)·`1283-1285`(getter)·`1021-1024`(isVerifiedExpectedDeliveryDate) | 현재 트리 기준. Audited LocalDateTime, "목표 금액 및 일정" 탭 노출값. paymentDeadline 이후여야 함. 과거 null 허용→현재 필수(:1352 주석) |
| 추천 선물 플래그 | be-api | `core/.../entity/Reward.java:153,303-305` | 현재 트리 기준. `recommended` Boolean 기본 FALSE, getRecommended() null-safe |
| 예상 발송 시작일→추천선물 복사(프로젝트 저장) | be-api | `api/.../service/v3/project/management/UpdateProjectV2Service.java:302-314` | 현재 트리 기준. **유일한 프로덕션 writer of project.setExpectedDeliveryDate** → filter(getRecommended).findFirst에 복사. 역방향(선물→프로젝트) 전 repo 부재 확정 |
| 추천선물 지정 시 프로젝트값 덮어쓰기 | be-api | `api/.../service/v3/reward/RewardV2Service.java:344-351`(수정, null-guard 有)·`481-484`(생성, null-guard 無=NPE 위험) | 현재 트리 기준. 주석 "추천 선물인 경우 프로젝트의 예상 전달 시작일로 덮어씌워짐" |
| 추천선물 유일성(REGULAR 1개) | be-api | `api/.../service/v3/reward/RewardV2Service.java:542-548` | 현재 트리 기준. count>1 → EXCEED_RECOMMENDED_REWARD_COUNT(403) |
| 마감일 변경 시 선물 발송일 일괄 shift | be-api | `api/.../service/v3/project/management/UpdateProjectV2Service.java:447-456` | 현재 트리 기준. 전체 REGULAR reward +payoutDayDiff — project.expectedDeliveryDate는 미shift(잠재 desync) |
| 에디터 뷰 예상 발송 시작일 노출 | be-api | `api/.../dto/v3/project/management/CreatorProjectViewDto.java:78,195` | 현재 트리 기준. =project값. lastRewardExpectedDeliveryDate(:124-125,194)는 전체 선물 max 별도값 |
| 목표 금액 및 일정 탭 입력 UI(master) | fe | `apps/tumblbug-web/shared/pages/ProjectEditor/Common/FundingPlan/EstimatedShippingStartDate.tsx:35-49(수정가능 조건),55-59(입력→project 저장),91-95(툴팁)` | 현재 트리 기준. datepicker 입력(min=결제종료일+1일, max=+4년). 툴팁 "추천 선물을 기준으로 첫 발송을 시작한 날" — 의미 정의는 추천 선물 기준, 데이터 흐름은 반대(프로젝트→선물) |
| 추천 선물 설정 체크박스(정책 문구 명문화) | fe | `apps/tumblbug-web/shared/pages/ProjectEditor/Management/Reward/CreateReward/RecommendReward.tsx:30-39(체크 시 project값 즉시 세팅),48(설명문),53-57(타 선물 추천 중 disabled)` | 현재 트리 기준. 설명문 "추천 선물의 선물 예상 발송 시작일은 프로젝트 예상 발송 시작일과 동일하게 적용되어 변경할 수 없습니다" = 연동 방향의 유일한 사용자향 명문화 |
| 추천 선물 발송일 입력 잠금(slave) | fe | `apps/tumblbug-web/shared/pages/ProjectEditor/Management/Reward/CreateReward/SetExpectedDeliveryDate.tsx:83(disabled),49-59(project값 sync)` | 현재 트리 기준. isRecommended면 datepicker disabled |
| 리워드 저장 payload(isRecommended 항상 포함) | fe | `apps/tumblbug-web/shared/stores/project-editor/reward/index.js:678-693(생성)·713-732(수정)·660-676(상시 정규화)` | 현재 트리 기준. toJS(this.reward) 전체 spread → payload 누락형 desync는 에디터 경유 불성립(상시만 isRecommended=null) |
| 심사요청 게이트 — 서버(부재 확정) | be-api | `api/.../service/project/management/UpdateProjectService.java:593-604(requestSubmit)→692-731(validateCommonStart)`; `core/.../entity/Project.java:1487-1500(validateRewardPolicyForStart)·1502-1536(validateForStart)` | 현재 트리 기준. 추천 선물·예상 발송일 검증 없음(선물 존재+아이템 매핑만 체크) — 노션 "심사요청 신규 조건"은 서버 미강제 |
| 심사요청 게이트 — fe 완성도 체크(단독 강제) | fe | `apps/tumblbug-web/shared/stores/project-editor/index.ts:118-135(checkRewardValue)` | 현재 트리 기준. 선물 존재 + 추천 선물 설정 완료해야 선물 섹션 완료(100%) — fe 단독 게이트 |

### 04 선물 (리워드·옵션·디지털 에셋)

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| Reward(선물) 엔티티 | be-api | `core/.../entity/Reward.java:60-380`(limit:101-104, userLimit:109-111, isSoldOut:299-301, NO_REWARD_MONEY:61) | money/limit/userLimit/type/backerCountCache |
| RewardType enum(REGULAR/EXTRA) | be-api | `core/.../type/RewardType.java:3-4` | |
| Item.optionType(0/1/2), optionDesc `\n` 분리 | be-api | `core/.../entity/Item.java:57,59,78-80` | 0=옵션없음/1=주관식/2=객관식 |
| RewardItem(quantity) | be-api | `core/.../entity/RewardItem.java:51` | |
| AddInfo(answerType 기본 TEXT) | be-api | `core/.../entity/AddInfo.java:56-58` | |
| AddInfoAnswerType enum(NONE/TEXT/SELECT) | be-api | `core/.../type/AddInfoAnswerType.java:3-6` | |
| PurchaseAddInfo(answer/address/phone) | be-api | `core/.../entity/PurchaseAddInfo.java:56-76` | |
| 후원 옵션 스냅샷 option length=1500 | be-api | `core/.../entity/ProjectWarrantyRewardItem.java:57` | |
| ProjectLimitReward.remainQuantity | be-api | `core/.../entity/ProjectLimitReward.java:46,68` | of()=reward.limit |
| 한정수량 Redis Lua(원자 체크+증가) | be-api | `core/.../service/reward/RewardOrderCountService.java:33,57-69,129-193,220-246` | TTL 180일, END_REWARD, 롤백복구 |
| DB 이중검증(checkLimit+countRewardBackers) | be-api | `api/.../service/v3/projectwarranty/ProjectWarrantyCreateV2Service.java:175-187` | > limit → END_REWARD |
| remainQuantity 비원자 재계산(배치 보정) | be-api | `api/.../service/v3/projectwarranty/UpdateProjectLimitRewardV2Service.java:28-50` | |
| 옵션 검증(글자수·값 검증 없음) | be-api | `api/.../service/v3/projectwarranty/ProjectWarrantyValidationService.java:121-177` | 객관식값 검증 TBB-3312로 제거 |
| 옵션 답변 저장 로직 | be-api | `api/.../service/projectwarrantyreward/ProjectWarrantyRewardService.java:50-78` | |
| v3 세대 — 선물 생성 | be-api | `api/.../dto/v3/project/management/CreateProjectRewardDto.java:30-31,51,59-60,35` | 금액1,000~9,999,999,999 / 한정1~10,000 / userLimit1~1,000 / 제목50자 |
| v3 세대 — 선물 수정 | be-api | `api/.../dto/v3/project/management/UpdateProjectRewardDto.java:29-30,49,39,35` | 금액1,000~9,999,999,999 / 한정1~10,000 / 아이템검증 min=1,max=100(legacy는 min=0,max=100 — 세대 차이) / 제목50자 |
| legacy 세대 — 선물 생성 | be-api | `api/.../dto/project/management/CreateProjectRewardDto.java:45` | 한정1~1,000 |
| legacy 세대 — 선물 수정 | be-api | `api/.../dto/project/management/UpdateProjectRewardDto.java:24-25,40,32,29` | 한정1~1,000 / 아이템0~100 / 설명50자 |
| DigitalAsset(status/type/expireAt) | be-api | `core/.../entity/DigitalAsset.java:43(100GB),131,150-166,199-215` | 상시=DELIVERED 즉시전달, revoke, isDeletable=PENDING, +1년 |
| DigitalAssetStatus enum(5종) | be-api | `core/.../type/DigitalAssetStatus.java:7-12` | PARTIAL_REVOKED는 주석 처리(미구현) |
| DigitalAssetType enum(FILE/TEXT) | be-api | `core/.../type/DigitalAssetType.java:7-8` | |
| DigitalAssetTargetType enum(REWARD/FILE) | be-api | `core/.../type/DigitalAssetTargetType.java:4` | |
| 디지털선물 파일 5GB | be-api | `api/.../dto/StoredFileCreateDto.java:30` | |
| 디지털선물 텍스트 300자 | be-api | `api/.../dto/management/digitalAsset/DigitalAssetUpdateTextDto.java:17` | |
| 디지털선물 이름 50자 | be-api | `api/.../dto/management/digitalAsset/DigitalAssetCreateDto.java:33` | |
| 디지털선물 만료 배치(DELIVERED→EXPIRED) | be-api | `core/.../repository/DigitalAssetRepository.java:53-54` | |
| RewardDigitalProfile.expiresInDays 기본 90(미사용) | be-api | `core/.../entity/RewardDigitalProfile.java:36` | 현재 read하는 곳 없음, 예약 필드 |
| 즉시전달 실제 유효기간 상수 DEFAULT_EXPIRES_IN_DAYS=90 | be-api | `api/.../service/.../ImmediateDigitalAssetDeliveryService.java:30,90` | TODO 주석: 추후 RewardDigitalProfile 활용 예정 |
| 선물 생성·수정 fe 호출(창작자 에디터 — 모두 v3) | fe | `apps/tumblbug-web/shared/stores/project-editor/reward/index.js:686,703(생성)·722,742(수정)·755(삭제=v2)·773(아이템 수정=v2)` | 생성·수정 POST/PUT `/api/v3/...reward` — 세대 혼용 없음(2026-07-13 확정) |
| 선물 생성·수정 v3 컨트롤러(URL prefix /api/v3) | be-api | `api/.../controller/v3/management/RewardItemV2Controller.java:71,113`; `api/.../controller/v3/ApiController.java:12` | 현재 트리 기준; v3 DTO(한정 1~10,000) 소비 |
| 선물 생성·수정 legacy 컨트롤러(URL prefix /api/v2) | be-api | `api/.../controller/project/management/RewardItemController.java:79,92,106`; `api/.../controller/ApiController.java:17` | 현재 트리 기준; legacy DTO(한정 1~1,000) — fe는 DELETE·item 수정만 사용 |
| 선물 옵션 100자 입력단 검증(주관식) | fe | `apps/tumblbug-web/shared/pages/ProjectEditor/Management/Reward/CreateItem/SetOption.tsx:47` | maxLength=100(optionDesc) — 서버 검증 없음(프론트 단독) |
| 선물 옵션 100자 입력단 검증(객관식) | fe | `apps/tumblbug-web/shared/pages/ProjectEditor/Management/Reward/CreateItem/ItemMultipleOption.tsx:19,128-130,176` | MAX_LENGTH=100 + Enter 초과 차단 |
| 옵션 허용 문자셋 화이트리스트(후원 폼) | fe | `apps/tumblbug-web/shared/utils/stringCheck.js:44,141-147`; 사용처 `shared/components/Textarea/Textarea.tsx:67`·`shared/components/RewardCard/RewardItemOptions.tsx:94`·`shared/pages/Warranty/Detail/Reward/OptionChangeableModal/TextOption.tsx:47` | VALID_INPUT_FOR_REWARD_TEXT_OPTION — 한글·영문·한자·숫자·특수문자·도형기호 허용, 이모지 배제(노션 정책과 정합) |

### 05 결제·청구

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 결제수단 Enum | be-api | `core/.../type/PaymentType.java:6-8` | CARD0/BANK_ACCOUNT1/NAVER_PAY2/IAMPORT3/KAKAO_PAY4 |
| 아임포트 PG채널 Enum | be-api | `core/.../type/PgProvider.java:6-9` | kakaopay/tosspay |
| 광고 결제수단 Enum | be-api | `core/.../type/AdsPaymentMethodType.java:3-4` | CARD/ACCOUNT/BIZMONEY (`type/ads/AdsPaymentMethodType.java`에 동일 내용 중복 클래스 별도 존재, 패키지만 다름) |
| 후원 결제 상태머신(12값) | be-api | `core/.../type/ProjectWarrantyState.java:10-21` | PLEDGED~REFUNDED/INIT (value 0~11) |
| 후원 결제 상태 전이 이벤트(선언적, 1건만) | be-api | `core/.../type/ProjectWarrantyStateEvent.java:4` | MARK_AS_CANCELLED(PLEDGED→CANCELLED) 유일 선언값 — 대부분 전이는 절차적 setState/updateState, 선언적 상태머신 미구현의 근거 |
| 상태 버킷(청구대상 등) | be-api | `core/.../entity/ProjectWarranty.java:144,184`; `core/.../type/ProjectWarrantyState.java:74-95` | CHARGEABLE={UNPAID,CHARGING} 등 |
| 후원 결과 타입 Enum | be-api | `core/.../type/FundType.java:4-10` | pledged/paid/dropped/refunded/pledged_not_charged |
| 관리 결제상태(뷰) Enum | be-api | `core/.../type/management/backer/PaymentState.java:11-17` | PLEDGED~REFUNDED, WarrantyState 매핑 |
| 프로젝트 상태(정산 연계) | be-api | `core/.../type/ProjectState.java:8-23` | 14개, 성공=SUCCEEDED_NOT_BALANCED |
| 마감→CHARGING 전이(성공 프로젝트만) | be-api | `batch/.../service/UpdateStateOnEndDateService.java:82,92`; `.../UpdateStateOnEndDateTasklet.java:91` | PLEDGED→CHARGING(5) |
| 후원 결제(청구) 배치 Job(3 step 순차) | be-api | `batch/.../config/backingpayment/BackingPaymentJobConfig.java:18-25` | naverpay→iamport→card (계좌 step 없음) |
| 청구 Tasklet(대상조회) | be-api | `batch/.../tasklet/backingpayment/BackingPaymentCardTasklet.java:42-49` | CHARGING/UNPAID, STORE 제외, cursor LIMIT 20 |
| 청구 멱등성 검증 | be-api | `batch/.../service/backingpayment/CardChargeValidator.java:47-104` | isExistInitWithdrawResult/결제수단변경 무시 |
| 카드 실청구 | be-api | `batch/.../service/backingpayment/CardBackingPaymentService.java:57-71` | 빌링키 결제 → handleAfterPayment |
| 성공/실패 상태전이 | be-api | `core/.../service/nicepay/NicePayResultHandler.java:34-45`; `core/.../service/warranty/ProjectWarrantyService.java:18` | 성공PAID/실패UNPAID, 파싱오류시 CHARGING복원 |
| 7일 실패→DROPPED 배치 | be-api | `batch/.../service/DropPaymentRejectedPledgesService.java:65-129` | SUCCEEDED_NOT_BALANCED & end_date=today-8일 |
| 카드(NicePay) 수수료율 | be-api | `core/.../service/nicepay/NicePayResultHandler.java:62-63` | 하드코딩 2.4%(payoutVersion 4/5/6)/2.8% |
| 네이버페이/아임포트 수수료 | be-api | `core/.../service/WithdrawResultService.java:44-67,93-97` | Math.round(금액×fee) |
| 결제 수수료율 config | be-api | `core/src/main/resources/application.yml:31,41`; `batch/.../application.yml:94`, `application-prod.yml:190` | naver v2 0.024 / v1 0.029·0.015 / iamport 0.025 |
| 상시 즉시결제 생성 | be-api | `api/.../v3/projectwarranty/immediate/StoreBackingCreateService.java:98-107,191-195,299-304` | INIT→PAID, 카드/IAMPORT만 |
| 상시 취소 | be-api | `api/.../v3/projectwarranty/immediate/StoreBackingCancelService.java` | 08 소관 상세 |

### 06 정산

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 펀딩 정산금 계산식·VAT_RATE=0.1·절사(DOWN) | be-api | `core/.../service/settlement/funding/FundingSettlementAmountCalcService.java:23,39-75` | 창작자 정산금=모금액−수수료−VAT−후불광고 |
| VAT 계산 공용 유틸(calculateVat, DOWN 절사) | be-api | `core/.../util/PriceUtil.java:15` | VAT_RATE=0.1(7행) 하드코딩, 서비스 전역 재사용 — 06 정산 서비스 자체 VAT_RATE 상수와는 별개 |
| 텀블벅 송금액(결제수수료 제외) | be-api | `core/.../service/settlement/funding/FundingSettlementAmountCalcService.java:58-64` | =서비스수수료+VAT+후불광고 (재무회계셀 결정 주석) |
| 펀딩 tumblbugFee=모금액×요율(Math.round) | be-api | `core/.../entity/Project.java:1234-1259` | payoutVersion 6 = 요율 커스텀 반영 |
| 펀딩 chargeFee=모금액×3% / depositFee=0 | be-api | `core/.../entity/Project.java:1261-1284` | payoutVersion≥4 |
| getCommissionRate(MOU 우선, 없으면 요금제율) | be-api | `core/.../entity/Project.java:1159-1167` | projectCommissions 우선 |
| 요금제율 Enum(BASIC5·PRO9·PREMIUM15·DEFAULT5%) | be-api | `core/.../type/RatePlanType.java:8-11` | |
| 상시 신규 생성(복사) 기본 요금제 | be-api | `api/.../service/management/store/StoreProjectManagementService.java:141` | ratePlanType=PRO 하드코딩 |
| 펀딩 정산일=결제종료일+7영업일 | be-api | `core/.../service/settlement/funding/SettlementDateCalcService.java:121-126` | fundingBalanceDate |
| 프리오더 정산일=배송완료+14일+1영업일 | be-api | `core/.../service/settlement/funding/SettlementDateCalcService.java:215-236` | preorderDefaultBalanceDate |
| 분할정산 1·2차 정산일(MANUAL 지정일) | be-api | `core/.../service/settlement/funding/SettlementDateCalcService.java:137-197` | two_phase balance date |
| 조건부 수동 분할정산 필드 | be-api | `core/.../entity/TwoPhasePayout.java:49-98` | two_phase_payouts, second_payout_schedule_type=MANUAL |
| 펀딩 정산 오케스트레이션 | be-api | `batch/.../settlement/funding/FundingSettlementTask.java:65-107` | settleProject: 검증→창작자송금→텀블벅송금→상태전이 |
| 정산 대상 추출(two_phase 제외) | be-api | `batch/.../settlement/funding/SettlementTargetService.java:31-58` | findFundingSettlementTargetIds, isBalanceDate |
| 정산 완료 상태 전이(멱등) | be-api | `core/.../entity/Project.java:1339-1347` | updateStateToSucceededBalanced, NOT_BALANCED에서만 |
| ProjectState 정산값 2종 | be-api | `core/.../type/ProjectState.java:17-18` | succeeded_not_balanced/balanced |
| 정산 완료 마킹 서비스 | be-api | `core/.../service/settlement/funding/ProjectSettlementCompletedMarkingService.java:33-40` | mark(projectId) |
| PayoutStatus(5종)·PayoutType(2종) | be-api | `api/.../type/payout/PayoutStatus.java:3-8`, `PayoutType.java:5-6` | 창작자향 표시 |
| 상시 정산 건별 계산식 | be-api | `core/.../service/settlement/store/datageneration/RewardTypeDetailService.java:144-208` | buildOne: commission HALF_UP·VAT DOWN·PG 3% |
| 정산 조회 API 응답 DTO 수수료율 하드코딩 재출현 | be-api | `api/.../controller/settlement/SettlementQueryController.java:63` | paymentFeeRate=0.03, RewardTypeDetailService(계산용, :159)와 별개 위치에 동일값 재하드코딩 — SSOT 이원화 지점 |
| 상시 정산 대상 기준 | be-api | `core/.../service/settlement/store/datageneration/SettlementDataGenerateTask.java:22,30-114` | 결제일+7 vs 후원확정 min, REFUND_AVAILABLE_DAYS=7 |
| MOU 커스텀 요율 여러 개면 최소값 우선 | be-api | `core/.../service/settlement/store/datageneration/CustomCommissionService.java:19-27` | findAllByProjectIdsIn |
| 상시 정산 상태머신 8종 | be-api | `core/.../entity/settlement/SettlementSchedule.java:104-128` | State enum, LOCKED/VISIBLE/AFTER_FIXED |
| 상시 상태 전이 | be-api | `core/.../service/settlement/store/ScheduleService.java:160-238` | FIXED만 transfer, FULLY_PAID만 manual 진입 |
| FIXED 확정 = 어드민 수동 API | be-api | `api/.../controller/admin/settlement/SettlementAdminCommandController.java:38` | updateStateWithTimestamp(FIXED) |
| FULLY_PAID 전이 = 이체 완료 | be-api | `core/.../service/settlement/store/transfer/TransferTask.java:140` | |
| SettlementSummary 계산·State 3종 | be-api | `core/.../entity/settlement/SettlementSummary.java:165-200` | 최종 정산금액, 납세자 정보 암호화 |
| SettlementDetail 필드·settlementAmount 정의 | be-api | `core/.../entity/settlement/SettlementDetail.java:62-175` | type REWARD/EXTRA_BACKING |
| SettlementTransfer RecipientType·State | be-api | `core/.../entity/settlement/SettlementTransfer.java:139-147` | 자동이체 기록 |
| TaxpayerType 2종 | be-api | `core/.../type/TaxpayerType.java:4-5` | 개인/법인사업자 |
| 세금계산서 생성(GENERATING_DOCUMENTS lock) | be-api | `core/.../service/settlement/store/taxinvoice/TaxInvoiceGenerateTask.java:25-45` | |
| CommissionRecord(예수금→수익계좌) | be-api | `core/.../entity/CommissionRecord.java:32,76-78` | 성공코드 0000, isSuccess |
| PaymentType 5종 | be-api | `core/.../type/PaymentType.java:7` | 카드/계좌/네이버/간편/카카오페이 |

### 08 취소·환불

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 취소 성격 Enum | be-api | `core/.../type/ProjectWarrantyCancelType.java:3-6` | CANCEL(자동승인)/REFUND(창작자승인) |
| 취소·환불 상태 Enum | be-api | `core/.../type/ProjectWarrantyCancelStatus.java:3-6` | REQUESTED/REJECTED/APPROVED |
| 취소·환불 사유 Enum | be-api | `core/.../type/ProjectWarrantyCancelReasonType.java:7-16` | 단순변심/주문실수/파손불량/오배송; BEFORE={2종}·AFTER={4종} |
| 후원 결과 타입(취소·환불 관점) | be-api | `core/.../type/FundType.java:4-10` | pledged/paid/dropped/refunded/pledged_not_charged |
| 크레딧환불 수단(11 인접) | be-api | `core/.../type/CreditRefundMethod.java:6-8` | CARD/BANK_ACCOUNT |
| 크레딧환불 상태(11 인접) | be-api | `core/.../type/UserCreditRefundHistoryStatus.java:6-8` | REQUESTED/COMPLETED/IN_PROGRESS/FAILED |
| 취소·환불 상태값·버킷 | be-api | `core/.../type/ProjectWarrantyState.java:8-21,58-95` | CANCELLED1/DROPPED4/PLEDGED_NOT_CHARGED6/REFUND_REQUESTED7~REFUNDED10 |
| 취소·환불 이력(cancels) 엔티티 | be-api | `core/.../entity/ProjectWarrantyCancel.java:48-160` | cancelType/status/reasonType/processingDueDate/extensionRequestedAt |
| 취소·환불 전이 정의 | be-api | `core/.../entity/ProjectWarrantyStateTransition.java:71,129,162,174,185` | MARK_AS_CANCELLED/STORE_BACKING_CANCEL/BILLING_KEY_INIT_CANCEL/MARK_AS_REFUND_PROCESSING/MARK_AS_REFUNDED |
| 기간펀딩 진행중 취소(v3) | be-api | `api/.../v3/projectwarranty/CancelProjectWarrantyV2Service.java:50-126` | PLEDGED→CANCELLED, 네이버expire/iamport취소, 한정수량 Redis 복구 |
| 기간펀딩 취소·환불요청(v1) | be-api | `api/.../projectwarranty/CancelProjectWarrantyService.java:67-153` | 미결제→PLEDGED_NOT_CHARGED(자동), 결제됨→REFUND_REQUESTED(+7일) |
| 취소가능 조건 | be-api | `core/.../entity/ProjectWarranty.java:936-946` | PLEDGED항상; 프리오더 배송완료면 전달+7일이내 |
| 부분/전체 취소 재계산 | be-api | `core/.../entity/ProjectWarranty.java:442-481` | cancelAll전액/cancel(rewardIds)차감/allCancled; 갯수 부분취소 미지원(TODO) |
| 선물 취소(전량, ProjectWarrantyReward) | be-api | `core/.../entity/ProjectWarrantyReward.java:161-165` | cancelledCount=count, money×count 반환 |
| 추가구성(EXTRA)↔취소 단위 매핑 | be-api | `core/.../entity/ProjectWarrantyReward.java:150-152`; `core/.../type/RewardType.java:3-4` | isExtraReward(); EXTRA도 독립 PWReward 라인 — 취소는 RewardType 무관 라인 id 단위(상시만 부분취소 가능) |
| 기간펀딩 무인자 전체취소 | be-api | `core/.../entity/ProjectWarranty.java:400`; `api/.../v3/projectwarranty/CancelProjectWarrantyV2Service.java:51,69` | 선물 선택 파라미터 부재 → 후원 전체 취소만(부분취소 경로 없음) |
| 상시 부분취소 모달(선물 라인 선택) | fe | `apps/tumblbug-web/shared/pages/Warranty/Detail/CancelModal/StoreOrderCancelModal/Modal.tsx:100-116`; `StoreRewardInfo.tsx:24-25,55-60` | 전체선택 시 `[]`(전체취소), 부분은 selectedRewards.id; 다운로드/취소완료 라인 disabled; 헤더 "디지털 에셋" 문맥(물리 선물 노출 조건 미확인) |
| 진행중 후원 전체취소 버튼 | fe | `apps/tumblbug-web/shared/pages/Warranty/Detail/WarrantyInfo/WarrantyCancelButton.tsx:110-113,151-159` | cancelWarranty({projectWarrantyId}) — 선물 미선택, 기간펀딩/프리오더 진행중 |
| 프리오더 환불 승인 | be-api | `api/.../management/backer/refund/RefundApproveService.java:63-131` | REFUND_REQUESTED→REFUND_PROCESSING, 계좌=Slack수동, SELECT FOR UPDATE |
| 프리오더 환불 거절 | be-api | `api/.../management/backer/refund/RefundRejectService.java:44-66` | REFUND_REQUESTED→REFUND_REJECTED |
| 환불 기한 연장 | be-api | `api/.../management/backer/refund/RefundDueDateExtensionService.java:40-104` | +3일, 1회 한정 |
| 환불 API 엔드포인트 | be-api | `api/.../controller/management/backer/RefundController.java:47-116` | refund-pending/info/backers/approve/reject/extend |
| 프리오더 환불 자동승인 배치 | be-api | `core/.../service/refund/PreorderRefundAutoApproveService.java:51-152` | 기한초과 REQUESTED 자동승인; 카드·네이버·Iamport만 |
| 환불 자동승인 배치 스케줄/Job | be-api | `batch/.../preorder/PreorderRefundAutoApproveJobConfig.java:17`; `.../Tasklet.java:17,29-51` | 매일 00:10, k8s CronJob |
| Iamport 환불 실행 | be-api | `core/.../service/refund/PreorderIamportRefundService.java:57-146` | 전액취소 isAll=true, MARK_AS_REFUNDED, commission 음수 기록 |
| 상시 즉시결제 취소 | be-api | `api/.../v3/projectwarranty/immediate/StoreBackingCancelService.java:71-171` | 부분/전체, 다운로드시 불가, allCancled시 전이 |
| NicePay 취소 PG연동 | be-api | `core/.../service/nicepay/NicePayService.java:136-197` | cancel_process.jsp, PartialCancelCode, CancelPwd |
| Iamport 상시 취소 PG연동 | be-api | `api/.../service/payment/IamportStorePaymentService.java:235-267` | isAll=!부분, checksumAmount=결제총액 |
| 환불교환정책(안내문) | be-api | `core/.../entity/RefundExchangePolicy.java:19-48` | projectId/statement/risk/isAdmin |
| 오픈런 강제취소(어드민) | be-api | `admin/.../service/project/AdminPreBackingCancelService.java:32-84` | 공개예정 PreProjectWarranty APPLIED→CANCELLED |
| 지갑 크레딧 환불(11 인접) | be-api | `api/.../service/wallet/CreditRefundService.java:41-58` | 수수료 3%, setScale(1,CEILING) |
| 프리오더 환불 승인 화면·안내문구 | fe | `apps/next-web/src/app/backer-manager/_components/backer-manager-refund/modal/RefundApprovalModal.tsx:58,70-76,90` | "즉시 결제 취소" 문구 — 계좌 건에 부정확(REFUND_PROCESSING+Slack 수동; 08 §확인필요 5) |
| 환불 승인/거절/연장 fe API 매핑 | fe | `apps/next-web/src/api/refund.ts:56-87`; `apps/next-web/src/constants/api.ts:35-59` | PUT `/api/v2/project-management/backer/projects/{uuid}/refund-backers/{warrantyUuid}/approve` |
| (부재 확정) fe-admin 프리오더 환불 화면 | fe-admin | 없음 — 전수 grep 0건 | refund 매치는 광고포인트(ad-point)·후불광고(postpaid-ads) 환불뿐 |

### 01 회원인증

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 이름(fullname) 글자수 | be-api | `api/.../dto/user/UpdateProfileDto.java:26-30`; `core/.../annotation/UserFullname.java:20` | @Size(min=1,max=20) — 노션 "2자 이상"과 불일치 |
| 이름(fullname) 허용 문자 | be-api | `core/.../annotation/UserFullname.java:16-18` | 정규식(한글자모/음절·영문·숫자·지정특수문자·공백) |
| 사용자 이름(URL)/프로필URL(userPermalink) | be-api | `api/.../dto/user/UpdateProfileDto.java:32-39` | @Size(min=3,max=20)+정규식`[a-zA-Z0-9\-_]+` |
| 소개(shortDescription) | be-api | `api/.../dto/user/UpdateProfileDto.java:41-43` | @Size(max=2500), 문자 제한 없음 |
| 웹사이트(websiteUrl) | be-api | `api/.../dto/user/UpdateProfileDto.java:45-50` | @Size(max=255)+URL 정규식(이메일 형식 아님) |
| 웹사이트 다건 저장 구조 | be-api | `core/.../entity/UserWebsite.java:34` | `user_websites`(1:N) |
| 아이디어스 주소(idusUrl) | be-api | `api/.../dto/user/UpdateProfileDto.java:52-57` | @Size(max=100)+정규식(idus.com/kr) |
| 스테디오 주소(steadioUrl, 서비스 종료로 미사용) | be-api | `api/.../dto/user/UpdateProfileDto.java:59-61,72-81` | 필드·정규화 로직 잔존, @Size 없음 |
| websiteUrl 필수 여부 검증기 | be-api | `core/.../validation/NullOrNotBlankValidator.java:24-34` | null 허용, 값 있으면 공백 거부 |
| WebsiteDto(죽은 코드, 미사용) | be-api | `api/.../dto/user/WebsiteDto.java` | 참조 0건 |
| 프로필 설정 화면(idusUrl 상시 렌더) | fe | `apps/tumblbug-web/shared/pages/UserSettings/Profile/index.tsx:40` | 유저 타입 무구분 → 후원자에게도 노출; 스테디오 입력 폼 제거됨 |

### 02 창작자

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 후원 유효 상태 그룹 PLEGED_STATES | be-api | `core/.../entity/ProjectWarranty.java:78-83` | [PLEDGED,CHARGING,PAID,UNPAID] — "PLEGED"는 코드 실제 상수명(오타 아님) |
| WARRANTIED_STATES(참고) | be-api | `core/.../entity/ProjectWarranty.java:85-92` | PLEGED_STATES+[REFUND_REQUESTED,REFUND_REJECTED] |
| PLEGED_STATES_WITH_DROPPED(참고) | be-api | `core/.../entity/ProjectWarranty.java:94-100` | PLEGED_STATES+[DROPPED] |
| 스튜디오 프로젝트 카드 상태별 버튼 가드 | fe | `apps/tumblbug-web/shared/pages/CreatorCenter/ProjectManage/components/myProjectCard/ProjectActionButtons.tsx:195-222` | failed·cancelled는 buttonConfig 미등록 → 폴백 "관리" 버튼만 노출 |
| 후원자 관리 페이지 접근성 게이트(fe) | fe | `apps/next-web/src/app/backer-manager/_components/Authorization.tsx:32-42` | NOT_ACCESSIBLE_PROJECT_STATUS → unaccessible 페이지 리다이렉트(404 아님) |
| 후원자 관리 접근성 판정(be) | be-api | `api/.../service/v3/management/backer/BackerManagementValidateService.java:30-52`; `api/.../controller/v3/management/backer/BackerController.java:79` | 현재 트리 기준; admin=허용 / 기간=SUCCEEDED_OR_ONGOING_STATES만 / 상시=STORE_BEFORE_ENDED_STATES |
| SUCCEEDED_OR_ONGOING_STATES 상수 | be-api | `core/.../entity/Project.java:188-193` | 현재 트리 기준; 성공 2종+진행 2종 — failed·cancelled 불포함 |

### 07 이행·후기

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 후원 엔티티 실제 테이블명 | be-api | `core/.../entity/ProjectWarranty.java:65` | `@Table(name="project_warranties")`(복수형, 노션 단수 표기는 오탈자) |
| 선물 전달 상태 Enum(reward_state, 6종) | be-api | `core/.../type/ProjectWarrantyRewardState.java:7-12` | STAND_BY0/INFO_REQUESTED1/DUMMY2/RESPONDED3/DELIVERED4/REFUNDED5 |
| 후기 작성 가능 "결제 성공" 판정 범위 | be-api | `core/.../type/ProjectWarrantyState.java:74-75` | PAYMENT_SUCCESS_STATES=[PAID,REFUND_REQUESTED,REFUND_REJECTED] |
| 후기 작성 가능 판정 로직(isReviewWritable) | be-api | `core/.../entity/ProjectWarranty.java:572-593` | 삭제안됨&&미작성&&PAYMENT_SUCCESS_STATES 포함 |
| 배송정보 조회 가능 기간(90일/30일) 로직 | be-api | `core/.../entity/ProjectWarranty.java:699-731` | isPossibleShippingAccessAndUpdate |

### 09 검색·추천·홈·둘러보기

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 프로젝트 상태 Enum(전체, PUBLISHED_STATES) | be-api | `core/.../type/ProjectState.java:8-23,51-52` | PUBLISHED_STATES가 discovery "진행상태 매핑" 6개값과 정합 |
| 검색 API 진입점 | be-api | `api/.../controller/search/SearchController.java:32-48` | `/search`, `/search/recommend`(Algolia 기반), query 서버측 검증 없음 |
| 검색어 문자 조건(4바이트 유니코드 제외) — fe 입력단 확정 | fe | `apps/tumblbug-web/shared/components/Header/TumblbugHeader/components/SearchHeader.tsx:107-114`; `apps/tumblbug-web/shared/utils/stringCheck.js:38` | SEARCH_KEYWORD_REGEX 화이트리스트 — `=` 허용·이모지/한자 배제, 위반 시 경고+입력 초기화(be-api 서버 검증 없음은 위 행 참조) |
| 검색 직접 URL 진입(입력단 검증 우회) | fe | `apps/tumblbug-web/shared/pages/SearchResult/hooks/useSrpFilters.ts:19-20` | 쿼리 무검증 전달 — 서버 검증도 없어 우회 가능(확인 백로그 B-41) |
| 최근 본 프로젝트(LocalStorage) | fe | `apps/tumblbug-web/shared/pages/List/RecentlyViewedProjects/utils.ts:9,27-80` | RECENTLY_VIEWED_PROJECT 키, MAX=100, 서버 무연동·로그인 무관 |
| 홈 큐레이션 현행 구성(옛 고정 3섹션 제거) | fe | `apps/tumblbug-web/shared/pages/FrontPage/index.tsx:17-46` | 성공임박=404 페이지에만 잔존, 신규/마감임박=CMS 옵션, 인기=PopularProjects |

### 10 커뮤니티·알림

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 후원(결제) 상태 PaymentState(7종) | be-api | `core/.../type/management/backer/PaymentState.java:11-17` | PLEDGED/CHARGING/UNPAID/PAID/CANCELLED/DROPPED/REFUNDED |
| UGC 신고 상태 Enum | be-api | `core/.../type/report/ContentReportManagementStatus.java:6` | REVIEW_NEEDED/NO_ACTION/UNHIDDEN/VALID/HIDDEN/AUTO_HIDDEN/DELETED |
| 메시지 신고 상태 Enum | be-api | `core/.../type/report/MessageReportStatus.java:4` | REVIEW_NEEDED/NO_ACTION/MESSAGE_BLOCKED/AUTO_MESSAGE_PENALTY/MESSAGE_PENALTY/USER_SUSPENDED |
| 자동 블라인드 임계값 상수 | be-api | `api/.../service/report/ContentReportManagementUpdatingService.java:19` | AUTO_HIDE_THRESHOLD=6 (노션 "3회"는 스테일) |
| 자동 블라인드 판정 로직 | be-api | `api/.../service/report/ContentReportManagementUpdatingService.java:76-80`; `core/.../repository/report/ContentReportManagementRepositoryCustomImpl.java:19-29` | REVIEW_NEEDED && accumulatedCountInReview≥5(반영전 값 기준, 실질 6건째 자동숨김) |
| accumulatedCountInReview 증감 규칙 | be-api | `core/.../entity/report/ContentReportManagement.java:65,95,110,141-156` | REVIEW_NEEDED 유지중 +1, 타상태→복귀시 1로 초기화 |
| 알림 타입 Enum(62종) | be-api | `core/.../type/NotificationType.java:7-97` | 업데이트 3종 :29-31(PROJECT_UPDATE_NOTI·PROJECT_PRELAUNCH_UPDATE_NOTI·PROJECT_LIKE_UPDATE_NOTI, tab=ACTIVITY). 이 3종을 발송하는 v2 코드 없음 → 발송 주체는 Ruby(be-api-legacy) |
| 푸시 수신설정 타입 Enum(30종) | be-api | `core/.../type/v3/PushNotificationType.java:5-39` | 업데이트 3토글 :7,27,28(후원/알림신청/좋아요 분리) / ALWAYS :39(설정무시 통과) / MARKETING_PUSH_NOTIFICATION_TYPES :51 |
| 구 푸시 타입 Enum(10종·미사용 추정) | be-api | `core/.../type/PushNotificationType.java:3-13` | v3와 별개 레거시 |
| 유저 푸시설정 모델(user_push_settings, 28컬럼) | be-api | `core/.../entity/UserPushSetting.java:48-160` | 기본 true, luckyDrawNewRound만 false(:152), setPushSetting switch :172-262 |
| 푸시 발송 설정 게이트 | be-api | `core/.../service/push/SendSystemPushMessageService.java:133-214` | validatePushType: 후원 업데이트=설정 AND !isEmailMuted 이중(:156-166), 알림신청/좋아요=단일 설정(:197-200), ALWAYS/null 무조건 통과(:137-139) |
| 푸시 실발송(AWS SNS) | be-api | `core/.../service/push/SendSystemPushMessageService.java:220-330` | PushMessage/Receiver 생성+SNS publish, Ruby 원본 이관분 |
| 창작자 업데이트 글 발행→알림 Ruby 위임 | be-api | `api/.../service/post/PostRegistService.java:88-94` | project public 시 delayed_jobs로 `SendNotification::PostNotification`·`SendPostMail` 적재. **실제 팬아웃(대상 선정·dedup·피드 적재·setting_type 지정)은 be-api-legacy(Ruby, sources 제외) — 코드 미검증** |
| Ruby DelayedJob 어댑터 | be-api | `core/.../service/DelayedJobService.java:49-95` | Ruby delayed_jobs 테이블에 YAML 핸들러 적재 |
| 업데이트 글 작성 rate limit(3회/1h) | be-api | `core/.../type/RateLimiterType.java:9`; `api/.../controller/v3/PostController.java:73` | POST_WRITING, key=project+user. **v3에만 적용** — 레거시 `api/.../controller/PostController.java:95` 미적용(우회 구멍). 수신자 기준 발송 스로틀은 전 repo 부재 확정(2026-07-16) |
| Post 유형/공개범위 Enum | be-api | `core/.../type/PostType.java:3-7`; `core/.../type/PostVisibleType.java:4-5` | DEFAULT/SUPPORT/PREPARATION/PROJECT_PROGRESS — 홍보성 vs 이행(배송)성 분류축 없음. 공개범위 PUBLIC/BACKER 2종 |
| 마감 프로젝트 성사/무산 알림(피드·푸시 분리 구조 예시) | be-api | `batch/.../job/service/SendNotificationEndProjectService.java:243-433` | createNotification 무조건 save(:412-428, 피드=설정 무관) / Ruby push_setting_type 오지정 버그 이력 주석 :59-63,311-315 |

### 11 광고센터

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 비즈머니 충전 최소/최대 한도 | be-api | `api/.../service/wallet/CreditChargeService.java:41-42,72-73,86-87` | CHARGE_AMOUNT_MIN=100원, REMAINING_AMOUNT_MAX=50,000,000원 |
| 비즈머니 유효기간(5년) | be-api | `core/.../entity/wallet/UserCredit.java:109` | expireDate=충전일+5년 |
| 결제 취소 가능 기간(365일, 노션 미기재) | be-api | `core/.../entity/wallet/UserCredit.java:32,98-99` | CANCEL_PERIOD_DAYS=365, canCancel() |
| 개별 입금 환불 수수료·반올림 | be-api | `api/.../service/wallet/CreditRefundService.java:43,56-57` | REFUND_COMMISSION_RATE=0.03, CEILING(소수1자리 올림) |
| 비즈머니 계정 상태 Enum(5종) | be-api | `core/.../type/UserCreditState.java:7` | PENDING/ACTIVE/EXPIRE/REFUNDED/CONSUMED |
| 정산 수수료율 Enum(요금제, 06과 교차확인) | be-api | `core/.../type/RatePlanType.java:8-11` | BASIC5%·PRO9%·PREMIUM15%·DEFAULT5%(상시 신규 기본값) |
| SNS 광고 서비스 수수료(요금제별, 정산과 별도) | be-api | `core/.../entity/ads/AdsProductCommission.java:35,49,51,64`; `api/.../dto/ads/mpa/RatePlanCommissionResponseDto.java:8-15` | `ads_product_commissions` 테이블, DB 설정값(코드 하드코딩 아님) |
| 캠페인 상태 Enum(8종) | be-api | `core/.../type/ads/AdsOrderStatus.java:7-14` | SUBMITTED/TUMBLBUG_VERIFIED/VERIFIED/REJECTED/ONGOING/ENDED/CANCELLED/ABORTED |
| 즉시환급 가능 상태 목록 | be-api | `core/.../type/ads/AdsOrderStatus.java:38-39` | MPA_IMMEDIATELY_REFUNDABLE_STATES=[SUBMITTED,TUMBLBUG_VERIFIED,VERIFIED] |
| 광고그룹/소재 상태(축소 Enum, 4종) | be-api | `core/.../type/ads/AdsOrderBasicStatus.java` | SUBMITTED/TUMBLBUG_VERIFIED/VERIFIED/REJECTED |
| 광고 유효 상태(계산값, 9종) | be-api | `core/.../type/ads/AdsEffectiveStatus.java` | 캠페인상태 8종 + CAMPAIGN_ABORTED |
| 광고 결제 상태(6종) | be-api | `core/.../type/ads/AdsPaymentStatus.java` | PENDING/SUCCESS/CANCELLED/PART_CANCELLED/FAILED/RETURNED |
| 일예산 프리셋 옵션 Enum(4종) | be-api | `core/.../type/ads/MpaOptionCode.java`; `core/.../entity/ads/AdsProductMpaOption.java:35,49,55` | AGGRESSIVE/RECOMMENDED/ECONOMICAL/CUSTOM, 실제 금액은 DB 시드값(미확정) |
| 소재 구성요소 Enum | be-api | `core/.../type/ads/MpaMediaType.java`, `MpaPlacementType.java`, `MpaComponent.java` | IMAGE/VIDEO, FACEBOOK/INSTAGRAM, CAMPAIGN/ADSET/AD |

### 12 럭키드로우 (티켓·응모·회차/경품·추첨/당첨·개인정보)

> 2026-07-14 domain-analyst-agent 분석 등재. 라인은 **현재 트리 기준**(be-api 기준 커밋 401a680d1 이후 추가된 도메인).

| 기능/도메인 | repo | 코드 경로 (file:line) | 비고 |
|---|---|---|---|
| 회차 상태 Enum(4종)+전이 가드 | be-api | `core/.../type/luckydraw/LuckyDrawState.java:3-8`; `core/.../entity/luckydraw/LuckyDraw.java:109-141` | DRAFT→PUBLISHED→DRAW_COMPLETED→ANNOUNCED, 선행 상태 아니면 IllegalStateException |
| 회차 표시 상태 Enum(5종·계산값) | be-api | `core/.../type/luckydraw/LuckyDrawDisplayState.java:10-36` | DRAFT/UPCOMING/IN_PROGRESS/CLOSED/ANNOUNCED |
| 당첨자 표시 상태 Enum(5종·계산값) | be-api | `core/.../type/luckydraw/LuckyDrawWinnerDisplayState.java:10-47` | DRAWN/EDITABLE/LOCKED/SHIPPED/CANCELED — 기한 경과·미입력이면 물리 기록 없이 계산상 CANCELED |
| 티켓 이력(2)/응모 필터(3)/당첨 동의(2) Enum | be-api | `core/.../type/luckydraw/LuckyDrawTicketHistoryEventType.java:3-6`; `EntryListFilter.java:6-13`; `LuckyDrawWinnerAgreement.java:9-31` | ISSUED·USED / ALL·IN_PROGRESS·ENDED / PRIZE_DELIVERY_PRIVACY·TAX_PRIVACY |
| DB 스키마 9테이블+ALTER | be-api | `core/.../resources/sql/init-lucky-draw.sql:1-283` | entry UNIQUE(prize,user)·winner 주민번호 암호화·푸시 2컬럼·약관 1종·알림 2종 신설. 티켓 정책 시드 INSERT 없음(DB 운영값) |
| 경품 엔티티·제세공과금 임계 | be-api | `core/.../entity/luckydraw/LuckyDrawPrize.java:32,101-103` | TAX_PROCESSING_PRICE_THRESHOLD=50,000, 판정 `> 50000`(초과). maxTicketsPerUser·draw_seed 보유 |
| 응모(자격·상한·묵시 동의·차감) | be-api | `core/.../service/luckydraw/LuckyDrawEntryCommandService.java:55-158` | 휴대폰 인증 필수, maxTicketsPerUser 상한, 응모=개인정보 동의 upsert, 컨트롤러 @Idempotent |
| 추첨(가중 비복원)·배송지 기한 7일 | be-api | `core/.../service/luckydraw/LuckyDrawWinnerSelectService.java:24-106` | MAX_SHIPPING_INFO_DEADLINE_DAYS=7 → announceAt+7일 23:59:59, seed 재현 가능 |
| 추첨 오케스트레이션(이원화 주의) | be-api | `core/.../service/luckydraw/LuckyDrawDrawCommandService.java:62-171` | drawWinners()=가중 비복원(운영) / 어드민 drawAll()=stub(id순 상위 N, 가중 미적용) — 상세 엔트리 참조 |
| 발표 알림 예약(Quartz)·ANNOUNCED 전이 | be-api | `core/.../service/luckydraw/LuckyDrawResultNotificationService.java:73-165`; `core/.../event/quartz/LuckyDrawWinnerNotiJob.java:47-107` | announceAt에 응모자 푸시+당첨자 알림톡(LD_WIN_ADDR_REQ_V1). 14시 하드코딩 없음 |
| 신규 회차 오픈 푸시(Quartz) | be-api | `core/.../event/quartz/LuckyDrawNewRoundPushJob.java:32-73` | startedAt 발송, 수신 설정 opt-in(기본 OFF) |
| 당첨자 정보 등록/수정/조회 | be-api | `api/.../service/luckydraw/LuckyDrawWinnerInfoApiService.java:47-401` | 본인인증 이름 일치+주민번호 앞6=생년월일 검증, 배송지만 수정 가능 |
| 사용자 API 컨트롤러(v4) | be-api | `api/.../controller/luckydraw/LuckyDrawController.java:60-192` | 응모·winner-info·목록. 응모 취소 엔드포인트 없음. 웹 응모 허용은 현행 정책(PO 확인 2026-07-15 — 최초 앱 전용에서 변경 배포) |
| 티켓 지급 배치(월)·신규 가입 지급 | be-api | `batch/.../tasklet/luckydraw/LuckyDrawTicketIssueTasklet.java:34-94`; `core/.../service/luckydraw/LuckyDrawTicketService.java:29,67-84` | 활성 유저 전체, 만료=지급월 말일 23:59:59(Asia/Seoul), 신규 가입 무조건 1장. cron은 k8s 소관(코드 부재) |
| 티켓 정책(등급별 티켓 지급 수량) 관리 | be-api | `core/.../entity/luckydraw/LuckyDrawTicketPolicy.java:29-60`; `admin/.../AdminLuckyDrawTicketPolicyService.java:21-23` | 현행 정책 = PRD 값(없음1/1~2단계2/3~4단계4/5단계10/6단계14/7단계20, PO 확인 2026-07-15). 추후 변동 대비 의도적으로 DB 관리(어드민 upsert, UNIQUE(tier_id), envers 이력) — 코드 상수는 DEFAULT/SIGNUP=1뿐 |
| 배송지 입력 리마인드 배치(D-2) | be-api | `batch/.../service/luckydraw/LuckyDrawWinnerInfoRemindService.java:28-98` | 푸시+알림톡 LD_WIN_ADDR_REMIND_V1 |
| 어드민 당첨 취소/송장/제세 엑셀 | be-api | `admin/.../service/luckydraw/AdminLuckyDrawWinnerService.java:64-268` | 엑셀 권한 Lv5+, 다운로드창 infoDeadline~announceAt+5년, LOCKED 최초 송장 등록 시만 발송 알림(LD_WIN_SHIP_INFO_V1) |
| 당첨자 마스킹(이름·전화) | be-api | `api/.../service/luckydraw/LuckyDrawApiService.java:286-336` | maskExceptFirst(이름 첫 글자 제외)+maskLastChar(전화 뒷자리) |
| (부재 확정) 개인정보 파기 배치 | be-api | `batch/.../tasklet/ExpiredDataCleanupTasklet.java:28-48` | 15단계에 lucky_draw 테이블 없음 — 파기 미구현(🔴 리스크) |
| fe 럭키드로우 화면 | fe | `apps/tumblbug-web/shared/pages/LuckyDraw*`; `.../hooks/luckyDraw/*`; `.../apis/luckyDraw/*` | 상태 미러. 웹 응모 페이지(LuckyDrawSubmit)는 공식 지원 기능(PO 확인 2026-07-15, 웹 응모 배포) |
| fe-admin 럭키드로우 콘솔 | fe-admin | `src/app/(main)/lucky-draw/**` (`const.ts:1-46`, `RoundFormModal.tsx:79`) | 상태 5종 미러, announceAt 자유 datetime 입력(14시 비강제) |

## 상세 엔트리 (비쌌던 탐색만)

- **선물(리워드) 한정수량 상한 — legacy vs v3 API 세대 병존**: 같은 이름의 `CreateProjectRewardDto`/`UpdateProjectRewardDto`가 `api/.../dto/project/management/`(legacy, 한정 1~1,000)와 `api/.../dto/v3/project/management/`(v3, 한정 1~10,000) 두 경로에 각각 존재. `find -iname`로 재검색해 "코드 내부 모순"이 아니라 "API 세대 병존"임을 확정(04-analysis.md §4-1). 리워드 관련 DTO를 열 때는 반드시 경로의 `v3/` 유무를 먼저 확인할 것.
- **정산 = 두 개의 독립 파이프라인(펀딩 vs 상시)**: 노션 정책 문서는 펀딩(프로젝트 단위) 정산만 다루고, 코드에는 `settlement/store`(월별·창작자별 집계, 8단계 상태머신 `SettlementSchedule.State`, 어드민 FIXED 확정 게이트) 파이프라인이 별도로 완비되어 있음(06-analysis.md §4-1). 정산 관련 코드를 찾을 때 `settlement/funding`과 `settlement/store`를 혼동하지 말 것.
- **요금제 수수료율 — 정산용과 광고용이 같은 Enum(`RatePlanType`)을 참조하되 값 저장 위치가 다름**: 정산 수수료율은 `RatePlanType.commissionRate`(코드 하드코딩, BASIC5%·PRO9%·PREMIUM15%), SNS 광고 수수료율은 `AdsProductCommission`(DB 테이블 `ads_product_commissions`, 요금제별 별도 설정값 — 2025-05-23 기준 BASIC15%·PRO10%·PREMIUM0%)로 완전히 별개 저장소(11-analysis.md §3·§4-2). "요금제 수수료" 언급 시 정산 문맥인지 광고 문맥인지 먼저 확인할 것.
- **후원 상태 상수명 오타 "PLEGED_STATES"는 실제 코드 상수명**: `ProjectWarranty.java:78-83`의 `PLEGED_STATES`(PLEDGED 아님)는 오타처럼 보이지만 코드베이스에 실제로 이 철자로 채택되어 있음(02-analysis.md §3). grep 시 `PLEGED`(오타 철자)로도 검색해야 누락이 없다.
- **상시 즉시결제 취소 시 Redis 리워드 주문수 복구 비활성화(버그성 의심)**: `StoreBackingCancelService.java:115`의 `decreaseRewardOrderCountOnRedis(...)` 호출이 주석 처리되어 있음. 기간펀딩 v2(`CancelProjectWarrantyV2Service`)는 동일 로직이 활성 상태라 비대칭이며, 08-analysis.md §5-3에서 "버그성 의심, 엔지니어 확인 필요"로 명시적으로 플래그된 항목.
- **럭키드로우 추첨 로직 이원화(버그성 의심)**: 운영 배치 경로 `LuckyDrawDrawCommandService.drawWinners():106-144`는 티켓 수 비율 가중 비복원 추첨(정상)이나, 어드민 수동 추첨 `AdminLuckyDrawDrawService.drawAll()` 경유 `:33,62-96,157-171`은 id ASC 상위 N명 선발 stub(가중치 미적용, seed=0, 주석 "후속 PR에서 교체 예정"). 운영에서 수동 추첨을 쓰면 공정성 훼손 — 실사용 여부 엔지니어 확인 필요.
- **럭키드로우 개인정보 파기 배치 부재(🔴 컴플라이언스)**: `ExpiredDataCleanupTasklet.java:28-48`의 만료 데이터 정리 15단계에 lucky_draw 계열 테이블이 없음. 주민등록번호(암호화, 법령 5년)·배송지·참여 동의 정보가 보유 기간 경과 후에도 물리 잔존. PRD의 "보유 기간 경과 시 파기" 문구와 코드 실동작이 불일치 — 파기 배치 신설 이슈화 대상(2026-07-14 분석).
- **"예상 발송 시작일 ↔ 추천 선물" 연동 = 프로젝트(master)→추천 선물(slave) 단방향**: 목표 금액 및 일정 탭의 예상 발송 시작일(`Project.expectedDeliveryDate`)이 창작자 입력 원천이고, 추천 선물(`Reward.recommended`)의 `expected_delivery_date`가 그 값으로 덮어써진다(프로젝트 저장 `UpdateProjectV2Service:302-314` / 추천 지정 `RewardV2Service:344-351,481-484`). 역방향은 전 repo 부재 확정(`project.setExpectedDeliveryDate(` 프로덕션 writer 1건뿐). "프로젝트가 추천 선물을 따라간다"는 흔한 오인은 fe 툴팁의 의미 정의("추천 선물을 기준으로 첫 발송을 시작한 날", `EstimatedShippingStartDate.tsx:91-95`)에서 비롯 — 의미 정의와 데이터 흐름 방향이 반대. 노션 '선물/아이템 변경 지원 정책'(`25d1f5a7134480fd9774dda6e3fe4ffd`)은 원래 "연동"만 기술·방향 미표기였으나 **2026-07-15 코드 확정 기반으로 방향을 본문에 명문화 반영 완료**(추천 선물 변경 행 참고사항). fe UI 문구(`RecommendReward.tsx:48`)도 방향 명시. 심사요청 게이트(추천 선물 필수)는 fe 완성도 체크 단독·서버 부재(2026-07-15 분석).

---

> 갱신 규칙: 새 [기능→repo→경로]를 팔 때마다 역색인 1행 추가. 새 repo는 `projects.md`, 새 클론은 `local-paths.md`에도 반영.
