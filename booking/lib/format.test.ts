import { describe, expect, it } from "vitest";
import { longDate, range } from "./format";
import { kstEpoch } from "./slots";

describe("longDate", () => {
  it("월·일과 요일을 붙인다", () => {
    // 2026-08-03 은 월요일이다.
    expect(longDate("2026-08-03")).toBe("8월 3일 (월)");
  });

  it("앞자리 0 을 떼고 보여준다", () => {
    expect(longDate("2026-01-05")).toBe("1월 5일 (월)");
  });
});

describe("range", () => {
  it("시작과 끝을 함께 보여준다", () => {
    expect(range(kstEpoch("2026-08-03", 600), 30)).toBe("8월 3일 (월) 10:00–10:30");
  });

  it("자정을 넘기지 않는 한 날짜는 시작 기준이다", () => {
    expect(range(kstEpoch("2026-08-03", 23 * 60 + 30), 15)).toBe("8월 3일 (월) 23:30–23:45");
  });
});
