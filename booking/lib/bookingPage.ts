/**
 * 예약 유형 입력 검증 — API 2·3 의 본문을 DB 행으로 바꾸기 전에 거르는 곳.
 *
 * 검증 라이브러리를 넣지 않는다. 필드가 7개고 규칙이 전부 한 줄짜리라,
 * 의존성 하나보다 아래 함수 하나가 싸다.
 */
import { toMinutes, type Dow, type Hours } from "./slots";

const DOW: Dow[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DURATIONS = [15, 30, 60];

export type PageInput = {
  title: string;
  description: string | null;
  durationMin: number;
  weeklyHours: Partial<Record<Dow, Hours[]>>;
  blockedDates: string[];
  meetingUrl: string | null;
  active: boolean;
};

/** 첫 번째 위반만 알려준다. 담당자 화면이 폼 하나짜리라 오류도 하나면 된다. */
export function parsePageInput(raw: unknown): { value: PageInput } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "본문이 객체가 아니다" };
  const body = raw as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 100) return { error: "제목은 1~100자다" };

  const description = optionalText(body.description, 500);
  if (description === false) return { error: "설명은 500자 이하다" };

  const durationMin = body.durationMin;
  if (typeof durationMin !== "number" || !DURATIONS.includes(durationMin)) {
    return { error: `소요시간은 ${DURATIONS.join("·")}분 중 하나다` };
  }

  const weeklyHours = parseWeeklyHours(body.weeklyHours);
  if ("error" in weeklyHours) return weeklyHours;

  const blockedDates = body.blockedDates ?? [];
  if (!Array.isArray(blockedDates) || !blockedDates.every((d) => typeof d === "string" && YMD.test(d))) {
    return { error: "예약 불가 날짜는 YYYY-MM-DD 배열이다" };
  }

  const meetingUrl = optionalText(body.meetingUrl, 500);
  if (meetingUrl === false) return { error: "미팅 링크는 500자 이하다" };
  if (meetingUrl && !/^https?:\/\//.test(meetingUrl)) {
    return { error: "미팅 링크는 http(s) 로 시작한다" };
  }

  return {
    value: {
      title,
      description,
      durationMin,
      weeklyHours: weeklyHours.value,
      blockedDates: blockedDates as string[],
      meetingUrl,
      active: body.active !== false,
    },
  };
}

/** 값이 없으면 null, 너무 길면 false */
function optionalText(raw: unknown, max: number): string | null | false {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return false;
  const text = raw.trim();
  if (!text) return null;
  return text.length <= max ? text : false;
}

function parseWeeklyHours(
  raw: unknown,
): { value: Partial<Record<Dow, Hours[]>> } | { error: string } {
  if (typeof raw !== "object" || raw === null) return { error: "운영시간이 없다" };

  const value: Partial<Record<Dow, Hours[]>> = {};

  for (const [dow, ranges] of Object.entries(raw)) {
    if (!DOW.includes(dow as Dow)) return { error: `요일 이름이 아니다: ${dow}` };
    if (!Array.isArray(ranges)) return { error: `${dow} 의 운영시간이 배열이 아니다` };
    if (ranges.length === 0) continue; // 빈 요일은 안 받는 요일과 같다

    for (const range of ranges) {
      if (!Array.isArray(range) || range.length !== 2 || !range.every((t) => HHMM.test(t))) {
        return { error: `${dow} 의 운영시간은 ["HH:MM","HH:MM"] 형식이다` };
      }
      if (toMinutes(range[0]) >= toMinutes(range[1])) {
        return { error: `${dow} 의 종료가 시작보다 이르다: ${range[0]}~${range[1]}` };
      }
    }
    value[dow as Dow] = ranges as Hours[];
  }

  if (Object.keys(value).length === 0) return { error: "운영시간이 있는 요일이 하나도 없다" };
  return { value };
}

/** 공개 링크에 쓰는 8자. 생성기 클래스를 만들지 않는다 */
export function newSlug(): string {
  return crypto.randomUUID().slice(0, 8);
}

/** DB 는 snake_case, API 는 camelCase. 경계가 여기 둘뿐이라 매핑 라이브러리를 넣지 않는다 */
export function toRow(input: PageInput) {
  return {
    title: input.title,
    description: input.description,
    duration_min: input.durationMin,
    weekly_hours: input.weeklyHours,
    blocked_dates: input.blockedDates,
    meeting_url: input.meetingUrl,
    active: input.active,
  };
}

export type PageRow = ReturnType<typeof toRow> & { id: number; slug: string };

export function fromRow(row: PageRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    durationMin: row.duration_min,
    weeklyHours: row.weekly_hours,
    blockedDates: row.blocked_dates,
    meetingUrl: row.meeting_url,
    active: row.active,
  };
}
