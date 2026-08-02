/** KST 표시 형식. 서버·클라이언트 양쪽에서 쓴다. */
import { kstEpoch, kstFields, toHhmm, type Dow } from "./slots";

/** 달력 머리글 순서 그대로 */
export const DOW_KR = ["일", "월", "화", "수", "목", "금", "토"];

const KR: Record<Dow, string> = {
  SUN: "일",
  MON: "월",
  TUE: "화",
  WED: "수",
  THU: "목",
  FRI: "금",
  SAT: "토",
};

/** "2026-08-03" → "8월 3일 (월)" */
export function longDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일 (${KR[kstFields(kstEpoch(ymd)).dow]})`;
}

/** epoch ms → "8월 3일 (월) 10:00" */
export function dateTime(startAt: number): string {
  const { ymd, minutes } = kstFields(startAt);
  return `${longDate(ymd)} ${toHhmm(minutes)}`;
}

/** epoch ms → "8월 3일 (월) 10:00–10:30" */
export function range(startAt: number, durationMin: number): string {
  const start = kstFields(startAt);
  const end = kstFields(startAt + durationMin * 60_000);
  return `${longDate(start.ymd)} ${toHhmm(start.minutes)}–${toHhmm(end.minutes)}`;
}
