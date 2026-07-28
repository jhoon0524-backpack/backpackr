import { describe, expect, it } from "vitest";
import { newSlug, parsePageInput } from "./bookingPage";

const ok = {
  title: "30분 상담",
  durationMin: 30,
  weeklyHours: { MON: [["10:00", "12:00"]] },
};

function parse(patch: Record<string, unknown> = {}) {
  return parsePageInput({ ...ok, ...patch });
}

function error(patch: Record<string, unknown>): string {
  const result = parse(patch);
  if (!("error" in result)) throw new Error("통과하면 안 되는 입력이 통과했다");
  return result.error;
}

function value(patch: Record<string, unknown> = {}) {
  const result = parse(patch);
  if ("error" in result) throw new Error(`막히면 안 되는 입력이 막혔다: ${result.error}`);
  return result.value;
}

describe("최소 입력", () => {
  it("제목·소요시간·운영시간만 있으면 통과한다", () => {
    expect(value()).toEqual({
      title: "30분 상담",
      description: null,
      durationMin: 30,
      weeklyHours: { MON: [["10:00", "12:00"]] },
      blockedDates: [],
      meetingUrl: null,
      active: true,
    });
  });

  it("active 는 넘기지 않으면 활성이다", () => {
    expect(value().active).toBe(true);
    expect(value({ active: false }).active).toBe(false);
  });

  it("빈 문자열은 null 로 들어간다 — 폼에서 안 채운 칸이다", () => {
    expect(value({ description: "", meetingUrl: "  " })).toMatchObject({
      description: null,
      meetingUrl: null,
    });
  });

  it("제목 앞뒤 공백은 떼고 저장한다", () => {
    expect(value({ title: "  상담  " }).title).toBe("상담");
  });
});

describe("막는 것", () => {
  it("본문이 객체가 아니면 막는다", () => {
    expect(parsePageInput(null)).toEqual({ error: "본문이 객체가 아니다" });
    expect(parsePageInput("문자열")).toEqual({ error: "본문이 객체가 아니다" });
  });

  it("제목이 비었거나 100자를 넘으면 막는다", () => {
    expect(error({ title: "   " })).toMatch(/제목/);
    expect(error({ title: "가".repeat(101) })).toMatch(/제목/);
  });

  it("소요시간은 15·30·60 뿐이다", () => {
    expect(error({ durationMin: 45 })).toMatch(/소요시간/);
    expect(error({ durationMin: "30" })).toMatch(/소요시간/);
  });

  it("요일 이름이 아니면 막는다", () => {
    expect(error({ weeklyHours: { MONDAY: [["10:00", "12:00"]] } })).toMatch(/MONDAY/);
  });

  it("시각 형식이 아니면 막는다", () => {
    expect(error({ weeklyHours: { MON: [["10:00", "25:00"]] } })).toMatch(/형식/);
    expect(error({ weeklyHours: { MON: [["10시", "12시"]] } })).toMatch(/형식/);
    expect(error({ weeklyHours: { MON: [["10:00"]] } })).toMatch(/형식/);
  });

  it("종료가 시작보다 이르거나 같으면 막는다 — 슬롯이 하나도 안 나오는 구간이다", () => {
    expect(error({ weeklyHours: { MON: [["12:00", "10:00"]] } })).toMatch(/이르다/);
    expect(error({ weeklyHours: { MON: [["10:00", "10:00"]] } })).toMatch(/이르다/);
  });

  it("운영시간이 있는 요일이 하나도 없으면 막는다", () => {
    expect(error({ weeklyHours: {} })).toMatch(/하나도 없다/);
    expect(error({ weeklyHours: { MON: [] } })).toMatch(/하나도 없다/);
  });

  it("예약 불가 날짜는 YYYY-MM-DD 배열이다", () => {
    expect(error({ blockedDates: ["2026/08/11"] })).toMatch(/YYYY-MM-DD/);
    expect(error({ blockedDates: "2026-08-11" })).toMatch(/YYYY-MM-DD/);
  });

  it("미팅 링크는 http(s) 로 시작해야 한다", () => {
    expect(error({ meetingUrl: "meet.google.com/abc" })).toMatch(/http/);
    expect(value({ meetingUrl: "https://meet.google.com/abc" }).meetingUrl).toBe(
      "https://meet.google.com/abc",
    );
  });
});

describe("통과시키는 것", () => {
  it("한 요일에 구간이 여러 개여도 된다", () => {
    const hours = { MON: [["10:00", "12:00"], ["14:00", "18:00"]] };
    expect(value({ weeklyHours: hours }).weeklyHours).toEqual(hours);
  });

  it("빈 요일은 통째로 빼고 저장한다 — 안 받는 요일과 같다", () => {
    expect(value({ weeklyHours: { MON: [["10:00", "12:00"]], TUE: [] } }).weeklyHours).toEqual({
      MON: [["10:00", "12:00"]],
    });
  });
});

describe("newSlug", () => {
  it("8자다", () => {
    expect(newSlug()).toHaveLength(8);
  });

  it("부를 때마다 다르다", () => {
    expect(new Set(Array.from({ length: 100 }, newSlug)).size).toBe(100);
  });
});
