"use client";

/**
 * 화면 ② — 예약 유형 생성·수정. 생성과 수정이 같은 폼이라 한 컴포넌트다.
 *
 * 앞뒤 여유 시간 설정이 없다. 담당자가 막고 싶은 시간은 자기 캘린더에 일정을
 * 넣는 쪽이 정확하다 — freebusy 가 그 구간을 busy 로 돌려주므로 여기서 할 일이 없다.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Dow, Hours } from "@/lib/slots";

import styles from "../admin.module.css";

const DAYS: [Dow, string][] = [
  ["MON", "월"],
  ["TUE", "화"],
  ["WED", "수"],
  ["THU", "목"],
  ["FRI", "금"],
  ["SAT", "토"],
  ["SUN", "일"],
];

const DEFAULT_HOURS: Hours = ["10:00", "18:00"];

export type FormValue = {
  title: string;
  description: string;
  durationMin: number;
  weeklyHours: Partial<Record<Dow, Hours[]>>;
  blockedDates: string[];
  meetingUrl: string;
  active: boolean;
};

export const EMPTY: FormValue = {
  title: "",
  description: "",
  durationMin: 30,
  weeklyHours: { MON: [DEFAULT_HOURS], TUE: [DEFAULT_HOURS], WED: [DEFAULT_HOURS], THU: [DEFAULT_HOURS], FRI: [DEFAULT_HOURS] },
  blockedDates: [],
  meetingUrl: "",
  active: true,
};

export function PageForm({ id, initial }: { id?: number; initial: FormValue }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormValue>(key: K, next: FormValue[K]) =>
    setValue({ ...value, [key]: next });

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>{id ? "예약 유형 수정" : "새 예약 유형"}</h1>
        <Link className={styles.btn} href="/admin">
          목록으로
        </Link>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.card}>
        <div className={styles.fields}>
          <div className={`${styles.field} ${styles.wide}`}>
            <label htmlFor="title">제목</label>
            <input
              id="title"
              value={value.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="30분 상담"
            />
          </div>

          <div className={`${styles.field} ${styles.wide}`}>
            <label htmlFor="description">설명 (선택)</label>
            <textarea
              id="description"
              value={value.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="duration">소요 시간</label>
            <select
              id="duration"
              value={value.durationMin}
              onChange={(e) => set("durationMin", Number(e.target.value))}
            >
              {[15, 30, 60].map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="meetingUrl">미팅 링크 (선택)</label>
            <input
              id="meetingUrl"
              value={value.meetingUrl}
              onChange={(e) => set("meetingUrl", e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <span className={styles.section}>운영 시간</span>
        <p className={styles.muted}>
          체크한 요일에만 예약을 받습니다. 점심시간처럼 하루 중 일부를 비우려면{" "}
          <b>시간대 추가</b>로 나누세요 — 예를 들어 10:00–12:00 과 14:00–18:00 두 개로 두면 그
          사이는 예약이 잡히지 않습니다.
        </p>
        <p className={styles.muted}>
          하루짜리 일정은 여기서 막지 않아도 됩니다. 구글 캘린더에 일정이 있으면 그 시간은 자동으로
          빠집니다.
        </p>

        <div className={styles.hours}>
          {DAYS.map(([dow, label]) => {
            const hours = value.weeklyHours[dow];
            return (
              <div className={styles.day} key={dow}>
                <span>{label}</span>
                <input
                  type="checkbox"
                  aria-label={`${label}요일 예약 받기`}
                  checked={Boolean(hours)}
                  onChange={(e) =>
                    set("weeklyHours", {
                      ...value.weeklyHours,
                      [dow]: e.target.checked ? [DEFAULT_HOURS] : undefined,
                    })
                  }
                />
                {hours?.map((slot, i) => (
                  <span className={styles.range} key={i}>
                    <input
                      type="time"
                      value={slot[0]}
                      onChange={(e) => setHour(dow, i, 0, e.target.value)}
                      aria-label={`${label}요일 ${i + 1}번째 시간대 시작`}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      value={slot[1]}
                      onChange={(e) => setHour(dow, i, 1, e.target.value)}
                      aria-label={`${label}요일 ${i + 1}번째 시간대 종료`}
                    />
                    {/* 시간대가 하나뿐이면 삭제를 숨긴다 — 그건 요일 체크를 끄는 것과 같고,
                        버튼으로 지우면 체크가 저절로 풀려 놀라게 된다 */}
                    {hours.length > 1 && (
                      <button
                        className={styles.btn}
                        onClick={() => removeRange(dow, i)}
                        title="이 시간대 삭제"
                        aria-label={`${label}요일 ${i + 1}번째 시간대 삭제`}
                      >
                        −
                      </button>
                    )}
                  </span>
                ))}
                {hours && (
                  <button
                    className={styles.btn}
                    onClick={() => addRange(dow)}
                    title="이 요일에 예약받는 시간대를 하나 더 만듭니다"
                  >
                    + 시간대 추가
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.card}>
        <span className={styles.section}>예약 불가 날짜</span>
        <p className={styles.muted}>
          휴가처럼 하루를 통째로 막을 때 씁니다. 운영 요일이어도 여기 넣은 날짜는 예약을 받지
          않습니다.
        </p>
        <div className={styles.day}>
          <input type="date" id="blocked" />
          <button
            className={styles.btn}
            onClick={() => {
              const input = document.getElementById("blocked") as HTMLInputElement;
              if (input.value && !value.blockedDates.includes(input.value)) {
                set("blockedDates", [...value.blockedDates, input.value].sort());
              }
              input.value = "";
            }}
          >
            추가
          </button>
        </div>
        {value.blockedDates.length > 0 && (
          <div className={styles.actions}>
            {value.blockedDates.map((date) => (
              <button
                className={styles.btn}
                key={date}
                onClick={() =>
                  set(
                    "blockedDates",
                    value.blockedDates.filter((d) => d !== date),
                  )
                }
              >
                {date} ✕
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.row}>
        <label className={styles.day}>
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          <span>예약 받는 중</span>
        </label>

        <button
          className={`${styles.btn} ${styles.pri}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            const res = await fetch(
              id ? `/admin/api/booking-pages/${id}` : "/admin/api/booking-pages",
              {
                method: id ? "PUT" : "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(value),
              },
            );
            setBusy(false);
            if (res.ok) {
              router.push("/admin");
              return;
            }
            const body = await res.json().catch(() => ({}));
            setError(body.error ?? "저장하지 못했습니다.");
          }}
        >
          {busy ? "저장하는 중" : "저장"}
        </button>
      </div>
    </div>
  );

  function setHour(dow: Dow, index: number, side: 0 | 1, next: string) {
    const hours = (value.weeklyHours[dow] ?? []).map((slot, i) =>
      i === index ? ((side === 0 ? [next, slot[1]] : [slot[0], next]) as Hours) : slot,
    );
    set("weeklyHours", { ...value.weeklyHours, [dow]: hours });
  }

  function addRange(dow: Dow) {
    set("weeklyHours", {
      ...value.weeklyHours,
      [dow]: [...(value.weeklyHours[dow] ?? []), DEFAULT_HOURS],
    });
  }

  function removeRange(dow: Dow, index: number) {
    const hours = (value.weeklyHours[dow] ?? []).filter((_, i) => i !== index);
    set("weeklyHours", { ...value.weeklyHours, [dow]: hours.length ? hours : undefined });
  }
}
