import { describe, expect, it } from "vitest";
import {
  availableSlots,
  guestCancelable,
  kstEpoch,
  kstFields,
  toHhmm,
  type BookingPage,
  type Hours,
} from "./slots";

// 2026-08-03 은 월요일이다.
const MON = "2026-08-03";
const TUE = "2026-08-04";

/** 리드타임에 걸리지 않도록 충분히 이른 "지금" */
const EARLY = kstEpoch("2026-08-01", 0);

function page(durationMin: number, ...monHours: Hours[]): BookingPage {
  return { durationMin, weeklyHours: { MON: monHours }, blockedDates: [] };
}

function times(slots: number[]): string[] {
  return slots.map((s) => toHhmm(kstFields(s).minutes));
}

function on(p: BookingPage, day: string, now = EARLY, booked: number[] = [], busy: { start: number; end: number }[] = []) {
  return times(availableSlots(p, day, day, now, booked, busy));
}

describe("1. 후보 생성", () => {
  it("구간 시작점 기준으로 duration 간격이다 — 정시가 아니다", () => {
    expect(on(page(30, ["10:00", "12:00"]), MON)).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("구간이 10:15 에 시작하면 슬롯도 10:15·10:45·11:15 이다", () => {
    expect(on(page(30, ["10:15", "11:45"]), MON)).toEqual(["10:15", "10:45", "11:15"]);
  });

  it("duration 이 남은 구간보다 길면 그 자리는 후보가 아니다", () => {
    expect(on(page(60, ["10:00", "11:30"]), MON)).toEqual(["10:00"]);
  });

  it("구간이 여러 개면 각각에서 따로 만든다", () => {
    expect(on(page(30, ["10:00", "11:00"], ["14:00", "15:00"]), MON))
      .toEqual(["10:00", "10:30", "14:00", "14:30"]);
  });

  it("운영시간이 없는 요일은 예약을 받지 않는다", () => {
    expect(on(page(30, ["10:00", "12:00"]), TUE)).toEqual([]);
  });

  it("blocked_dates 에 든 날은 통째로 빠진다", () => {
    const p = { ...page(30, ["10:00", "12:00"]), blockedDates: [MON] };
    expect(on(p, MON)).toEqual([]);
  });
});

describe("2. 리드타임", () => {
  it("지금 + 4시간 이전은 제거한다", () => {
    // 07:15 → 11:15 부터 가능
    expect(on(page(30, ["10:00", "12:00"]), MON, kstEpoch(MON, 7 * 60 + 15))).toEqual(["11:30"]);
  });

  it("정확히 4시간 뒤 슬롯은 남는다 — 경계는 포함이다", () => {
    expect(on(page(30, ["10:00", "12:00"]), MON, kstEpoch(MON, 6 * 60)))
      .toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });
});

describe("3·4. 점유 구간 제외", () => {
  it("활성 예약이 잡힌 시각은 빠진다", () => {
    expect(on(page(30, ["10:00", "12:00"]), MON, EARLY, [kstEpoch(MON, 10 * 60 + 30)]))
      .toEqual(["10:00", "11:00", "11:30"]);
  });

  it("캘린더 busy 와 겹치면 빠진다", () => {
    const busy = [{ start: kstEpoch(MON, 10 * 60 + 45), end: kstEpoch(MON, 11 * 60 + 15) }];
    expect(on(page(30, ["10:00", "12:00"]), MON, EARLY, [], busy)).toEqual(["10:00", "11:30"]);
  });

  it("경계 접촉은 겹침이 아니다 — busy 가 끝나는 시각에 바로 예약할 수 있다", () => {
    const busy = [{ start: kstEpoch(MON, 10 * 60), end: kstEpoch(MON, 10 * 60 + 30) }];
    expect(on(page(30, ["10:00", "12:00"]), MON, EARLY, [], busy)).toEqual(["10:30", "11:00", "11:30"]);
  });

  it("담당자가 캘린더에 넣은 블록이 곧 예약 불가 시간이다", () => {
    const block = [{ start: kstEpoch(MON, 10 * 60 + 30), end: kstEpoch(MON, 11 * 60 + 30) }];
    expect(on(page(30, ["10:00", "12:00"]), MON, EARLY, [], block)).toEqual(["10:00", "11:30"]);
  });

  it("취소된 예약의 시각은 다시 슬롯으로 나온다", () => {
    const p = page(30, ["10:00", "11:00"]);
    expect(on(p, MON, EARLY, [kstEpoch(MON, 10 * 60)])).toEqual(["10:30"]);
    expect(on(p, MON, EARLY, [])).toEqual(["10:00", "10:30"]);
  });
});

describe("조회 범위", () => {
  it("여러 날을 한 번에 계산하고 오름차순으로 돌려준다", () => {
    const p: BookingPage = {
      durationMin: 60,
      weeklyHours: { MON: [["10:00", "11:00"]], TUE: [["14:00", "15:00"]] },
      blockedDates: [],
    };
    expect(availableSlots(p, MON, TUE, EARLY, [], []))
      .toEqual([kstEpoch(MON, 10 * 60), kstEpoch(TUE, 14 * 60)]);
  });

  it("예약 창 14일을 넘겨 요청하면 거절한다", () => {
    expect(() => availableSlots(page(30, ["10:00", "12:00"]), MON, "2026-08-18", EARLY, [], []))
      .toThrow(/14일/);
  });

  it("정확히 14일 범위는 통과한다", () => {
    expect(() => availableSlots(page(30, ["10:00", "12:00"]), MON, "2026-08-17", EARLY, [], []))
      .not.toThrow();
  });

  it("to 가 from 보다 이르면 거절한다", () => {
    expect(() => availableSlots(page(30, ["10:00", "12:00"]), MON, "2026-08-02", EARLY, [], []))
      .toThrow(/이르다/);
  });
});

describe("타임존", () => {
  it("서버 타임존이 무엇이든 결과가 같다", () => {
    const p = page(30, ["10:00", "12:00"]);
    const now = kstEpoch(MON, 7 * 60 + 15);
    const expected = availableSlots(p, MON, MON, now, [], []);

    const original = process.env.TZ;
    for (const tz of ["UTC", "America/New_York", "Pacific/Kiritimati"]) {
      process.env.TZ = tz;
      expect(availableSlots(p, MON, MON, now, [], [])).toEqual(expected);
    }
    process.env.TZ = original;
  });

  it("KST 벽시계 변환이 왕복한다", () => {
    expect(kstFields(kstEpoch(MON, 14 * 60 + 30))).toEqual({ ymd: MON, dow: "MON", minutes: 870 });
  });
});

describe("취소 가능 판별", () => {
  const meeting = kstEpoch(MON, 14 * 60);
  const hours = (n: number) => n * 60 * 60 * 1000;

  it("2시간보다 여유가 있으면 취소할 수 있다", () => {
    expect(guestCancelable(meeting, meeting - hours(2) - 60_000)).toBe(true);
  });

  it("정확히 2시간 전이면 이미 닫힌다", () => {
    expect(guestCancelable(meeting, meeting - hours(2))).toBe(false);
  });

  it("2시간 안쪽이면 닫힌다", () => {
    expect(guestCancelable(meeting, meeting - hours(1.5))).toBe(false);
  });

  it("이미 지난 미팅도 닫힌다", () => {
    expect(guestCancelable(meeting, meeting + hours(1))).toBe(false);
  });
});
