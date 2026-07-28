/**
 * 슬롯 계산 — handoff 4장. 공개 슬롯 조회 엔드포인트의 전부다.
 *
 * 시각은 전부 **UTC epoch ms** 로 다루고, KST 벽시계는 경계에서만 만든다.
 * 서버가 어느 타임존에서 돌든 결과가 같아야 하기 때문이다 — 목업에서 이걸
 * `new Date()` 로 처리했다가 뉴욕에서 열면 슬롯이 달라지는 버그가 났다.
 */

export const LEAD_TIME_HOURS = 4;
export const WINDOW_DAYS = 14;
export const CANCEL_WINDOW_HOURS = 2;

/** 한국은 서머타임이 없어 오프셋이 항상 +09:00 이다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Dow = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
const DOW: Dow[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** 운영 구간 하나. ["10:00", "12:00"] */
export type Hours = [string, string];

export type BookingPage = {
  durationMin: number;
  /** 없는 요일은 예약을 받지 않는다 */
  weeklyHours: Partial<Record<Dow, Hours[]>>;
  /** "2026-08-11" */
  blockedDates: string[];
};

/** freebusy 응답의 바쁨 구간. [start, end) */
export type BusyPeriod = { start: number; end: number };

/** "10:00" → 600 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 600 → "10:00" */
export function toHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** KST 벽시계(날짜 + 자정부터의 분) → epoch ms */
export function kstEpoch(ymd: string, minutes = 0): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) + minutes * 60_000 - KST_OFFSET_MS;
}

/** epoch ms → KST 벽시계 */
export function kstFields(ms: number): { ymd: string; dow: Dow; minutes: number } {
  const shifted = new Date(ms + KST_OFFSET_MS);
  const ymd = shifted.toISOString().slice(0, 10);
  return {
    ymd,
    dow: DOW[shifted.getUTCDay()],
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((kstEpoch(to) - kstEpoch(from)) / DAY_MS);
}

/**
 * @param activeBookings 활성 예약(canceled_ref = 0)의 시작 시각. 취소된 것을 넘기면 슬롯이 영영 안 열린다
 * @param busy           담당자 캘린더의 바쁨 구간
 * @returns 예약 가능한 슬롯 시작 시각. 오름차순
 */
export function availableSlots(
  page: BookingPage,
  from: string,
  to: string,
  now: number,
  activeBookings: number[],
  busy: BusyPeriod[],
): number[] {
  const span = daysBetween(from, to);
  if (span < 0) throw new Error(`to 가 from 보다 이르다: ${from} ~ ${to}`);
  if (span > WINDOW_DAYS) throw new Error(`예약 창 ${WINDOW_DAYS}일을 넘었다: ${from} ~ ${to}`);

  const durationMs = page.durationMin * 60_000;
  const earliest = now + LEAD_TIME_HOURS * 60 * 60 * 1000;
  const blocked = new Set(page.blockedDates);

  // 3. 점유 구간 수집 — 활성 예약과 캘린더 busy 를 한 목록으로 합친다.
  //    판정 코드가 두 벌이면 한쪽만 고치는 실수가 난다.
  const occupied: BusyPeriod[] = [
    ...busy,
    ...activeBookings.map((start) => ({ start, end: start + durationMs })),
  ];

  const slots: number[] = [];

  for (let ymd = from; daysBetween(ymd, to) >= 0; ymd = addDays(ymd, 1)) {
    if (blocked.has(ymd)) continue;

    const hours = page.weeklyHours[kstFields(kstEpoch(ymd)).dow];
    if (!hours) continue;

    for (const [start, end] of hours) {
      const endMin = toMinutes(end);

      // 1. 후보 생성 — 구간 시작점 기준으로 duration 간격
      for (let t = toMinutes(start); t + page.durationMin <= endMin; t += page.durationMin) {
        const slotStart = kstEpoch(ymd, t);
        const slotEnd = slotStart + durationMs;

        // 2. 리드타임 제외
        if (slotStart < earliest) continue;

        // 4. 겹침 제외 — 경계 접촉은 겹침이 아니다
        if (occupied.some((p) => slotStart < p.end && p.start < slotEnd)) continue;

        slots.push(slotStart);
      }
    }
  }

  return slots.sort((a, b) => a - b);
}

/**
 * 예약자 취소 가능 판별. 담당자 취소에는 시간 제한이 없다.
 */
export function guestCancelable(startAt: number, now: number): boolean {
  return startAt - CANCEL_WINDOW_HOURS * 60 * 60 * 1000 > now;
}
