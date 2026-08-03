"use client";

/**
 * 예약 흐름 — 목업(docs/prd/prototype.html)의 화면 전환을 그대로 옮긴 것.
 * 1단계 시간 선택 → 2단계 정보 입력 → 확정. 실패는 409·503 두 갈래다.
 *
 * **슬롯은 예약 창 전체를 한 번에 받아 날짜별로 나눈다.** 날짜를 누를 때마다
 * 부르면 달을 넘길 때마다 왕복이 생기는데, 창이 14일이라 어차피 한 번에 들어온다.
 */
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { DOW_KR, longDate, range } from "@/lib/format";
import { kstFields, toHhmm, WINDOW_DAYS } from "@/lib/slots";

const ORG = "백패커";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DAY_MS = 24 * 60 * 60 * 1000;

type Draft = { name: string; company: string; email: string; phone: string; memo: string };

type Confirmed = {
  id: string;
  startAt: number;
  durationMin: number;
  title: string;
  meetingUrl: string | null;
  hostName: string;
};

export function Booking(props: {
  slug: string;
  title: string;
  description: string | null;
  durationMin: number;
  hostName: string;
  hostEmail: string;
  online: boolean;
  bookable: boolean;
  prefill: Omit<Draft, "memo">;
  /** 요청 시각. 렌더 중에 시계를 읽으면 재렌더마다 예약 창이 흔들린다 */
  now: number;
}) {
  const [slots, setSlots] = useState<number[] | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(kstFields(props.now).ymd));
  const [draft, setDraft] = useState<Draft>({ ...props.prefill, memo: "" });
  const [agreed, setAgreed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState<"pick" | "form" | "done" | "canceled">("pick");
  const [error, setError] = useState<"SLOT_TAKEN" | "FAILED" | null>(null);
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState<Confirmed | null>(null);

  const prefilled = Boolean(props.prefill.name && props.prefill.email);

  const today = kstFields(props.now).ymd;
  const windowEnd = kstFields(props.now + WINDOW_DAYS * DAY_MS).ymd;

  useEffect(() => {
    if (!props.bookable) return;
    fetch(`/api/booking/${props.slug}/slots?from=${today}&to=${windowEnd}`)
      .then((r) => r.json())
      .then((body) => setSlots(body.slots ?? []))
      .catch(() => setSlots([]));
  }, [props.slug, props.bookable, today, windowEnd]);

  /** 날짜별 슬롯. 달력과 오른쪽 패널이 같은 목록을 본다 */
  const byDate = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const slot of slots ?? []) {
      const ymd = kstFields(slot).ymd;
      map.set(ymd, [...(map.get(ymd) ?? []), slot]);
    }
    return map;
  }, [slots]);

  if (!props.bookable) return <Shell {...props}>{suspended(props)}</Shell>;

  if (stage === "done" && booking) {
    return (
      <Shell {...props}>
        <Done
          booking={booking}
          email={draft.email}
          onCancel={async () => {
            setBusy(true);
            const res = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
            setBusy(false);
            if (res.ok) setStage("canceled");
            else setError("FAILED");
          }}
          busy={busy}
        />
      </Shell>
    );
  }

  if (stage === "canceled") {
    return (
      <Shell {...props}>
        <div className="result">
          <h2>예약이 취소되었습니다</h2>
          <p>해당 시간은 다시 예약 가능한 슬롯으로 열렸습니다.</p>
          <div className="row">
            <button
              type="button"
              className="btn pri"
              onClick={() => {
                setStage("pick");
                setTime(null);
                setError(null);
                setBooking(null);
                setSlots(null);
                refetch(props.slug, today, windowEnd, setSlots);
              }}
            >
              다시 예약하기
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell {...props}>
        <div className="result">
          <h2>{error === "SLOT_TAKEN" ? "방금 마감된 시간입니다" : "예약을 완료하지 못했습니다"}</h2>
          <div className="alert">
            <b>
              {error === "SLOT_TAKEN"
                ? "다른 분이 먼저 예약했습니다."
                : "일시적인 오류가 발생해 예약이 저장되지 않았습니다."}
            </b>
            <p>
              {error === "SLOT_TAKEN"
                ? "입력하신 내용은 그대로 두었습니다. 다른 시간을 선택해 주세요."
                : "잠시 후 다시 시도해 주세요. 같은 시간이 아직 열려 있습니다."}
            </p>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn pri"
              onClick={() => {
                setError(null);
                if (error === "SLOT_TAKEN") {
                  // 입력값은 남기고 시간만 다시 고르게 한다.
                  setStage("pick");
                  setTime(null);
                  refetch(props.slug, today, windowEnd, setSlots);
                } else {
                  setStage("form");
                }
              }}
            >
              {error === "SLOT_TAKEN" ? "시간 다시 고르기" : "다시 시도"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (stage === "form" && time !== null) {
    const summary = prefilled && !editing;
    const emailBad = Boolean(draft.email.trim()) && !EMAIL_RE.test(draft.email.trim());
    const ready = Boolean(draft.name.trim()) && EMAIL_RE.test(draft.email.trim()) && agreed;

    return (
      <Shell {...props}>
        <div className="form">
          <div className="step">2단계 — {summary ? "확인" : "정보 입력"}</div>
          <div className="picked">
            <span>{range(time, props.durationMin)}</span>
            <button type="button" className="btn sm" onClick={() => setStage("pick")}>
              시간 다시 고르기
            </button>
          </div>

          {summary ? (
            <div className="summary">
              <div className="who">
                {draft.name} · {draft.company}
              </div>
              <div className="contact">
                {draft.email} · {draft.phone}
              </div>
              <div className="by">
                <span>{props.hostName} 담당자가 미리 입력한 정보입니다</span>
                <button type="button" className="btn sm" onClick={() => setEditing(true)}>
                  수정
                </button>
              </div>
            </div>
          ) : (
            <div className="fields">
              <Field label="이름" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <Field
                label="회사명"
                value={draft.company}
                onChange={(v) => setDraft({ ...draft, company: v })}
              />
              <Field
                label="이메일"
                type="email"
                hint="캘린더 초대를 보냅니다"
                value={draft.email}
                invalid={emailBad}
                onChange={(v) => setDraft({ ...draft, email: v })}
              />
              <Field
                label="연락처"
                type="tel"
                value={draft.phone}
                onChange={(v) => setDraft({ ...draft, phone: v })}
              />
              <div className="field wide">
                <label htmlFor="f-memo">미리 알려주실 내용 (선택)</label>
                <textarea
                  id="f-memo"
                  value={draft.memo}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="consent">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <div>
              <b>개인정보 수집·이용에 동의합니다 (필수)</b>
              <p>
                수집 항목 이름·회사명·이메일·연락처 · 목적 미팅 일정 확정 및 안내 · 보유 기간 미팅
                종료 후 3개월
              </p>
            </div>
          </div>

          <div className="foot">
            <p>확정 즉시 캘린더 초대와 안내 메일이 발송됩니다.</p>
            <button
              type="button"
              className="btn pri"
              disabled={!ready || busy}
              onClick={async () => {
                setBusy(true);
                const res = await fetch(`/api/booking/${props.slug}`, {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ ...draft, startAt: time, consent: true }),
                });
                setBusy(false);
                if (res.ok) {
                  setBooking(await res.json());
                  setStage("done");
                  return;
                }
                const body = await res.json().catch(() => ({}));
                setError(body.error === "SLOT_TAKEN" ? "SLOT_TAKEN" : "FAILED");
              }}
            >
              {busy ? "확정하는 중" : "예약 확정"}
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // 1단계 — 시간 선택
  const daySlots = date ? (byDate.get(date) ?? []) : [];
  const prevOk = monthStart > startOfMonth(today);
  const nextOk = monthStart < startOfMonth(windowEnd);

  return (
    <Shell {...props}>
      <div className="picker">
        <div>
          <div className="step">1단계 — 시간 선택</div>
          <div className="month">
            <strong>
              {Number(monthStart.slice(0, 4))}년 {Number(monthStart.slice(5, 7))}월
            </strong>
            <div className="nav">
              <button
                type="button"
                disabled={!prevOk}
                aria-label="이전 달"
                onClick={() => setMonthStart(shiftMonth(monthStart, -1))}
              >
                ‹
              </button>
              <button
                type="button"
                disabled={!nextOk}
                aria-label="다음 달"
                onClick={() => setMonthStart(shiftMonth(monthStart, 1))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid">
            {DOW_KR.map((w) => (
              <div className="dow" key={w}>
                {w}
              </div>
            ))}
            {calendarCells(monthStart).map((cell, i) =>
              cell === null ? (
                <div className="day blank" key={`blank-${i}`} />
              ) : byDate.has(cell.ymd) ? (
                <button
                  type="button"
                  key={cell.ymd}
                  className={`day ${cell.ymd === date ? "on" : "open"}`}
                  aria-current={cell.ymd === date ? "date" : undefined}
                  onClick={() => setDate(cell.ymd)}
                >
                  {cell.n}
                </button>
              ) : (
                <div className="day off" key={cell.ymd}>
                  {cell.n}
                </div>
              ),
            )}
          </div>
          <p className="tz">모든 시간은 한국 표준시(KST) 기준입니다.</p>
        </div>

        <div>
          {slots === null ? (
            <p className="empty">시간을 불러오는 중입니다.</p>
          ) : !date ? (
            <p className="empty">날짜를 먼저 선택해 주세요.</p>
          ) : (
            <>
              <div className="slot-head">{longDate(date)}</div>
              {daySlots.length === 0 ? (
                <p className="empty">남은 시간이 없습니다.</p>
              ) : (
                <div className="slots">
                  {daySlots.map((slot) => (
                    <button
                      type="button"
                      className="slot"
                      key={slot}
                      aria-label={`${toHhmm(kstFields(slot).minutes)} 시작, ${props.durationMin}분`}
                      onClick={() => {
                        setTime(slot);
                        setStage("form");
                      }}
                    >
                      {toHhmm(kstFields(slot).minutes)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  description,
  durationMin,
  hostName,
  online,
  children,
}: {
  title: string;
  description: string | null;
  durationMin: number;
  hostName: string;
  online: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="stage">
      <div className="card">
        <div className="rail">
          <Image className="mark" src="/logo.png" alt={ORG} width={2000} height={566} priority />
          <div className="host">
            {hostName} · {ORG}
          </div>
          <h1>{title}</h1>
          <div className="meta">
            <div>
              <span className="k">소요</span>
              {durationMin}분
            </div>
            {online && (
              <div>
                <span className="k">방식</span>온라인 미팅
              </div>
            )}
          </div>
          {description && <div className="desc">{description}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Done({
  booking,
  email,
  onCancel,
  busy,
}: {
  booking: Confirmed;
  email: string;
  onCancel: () => void;
  busy: boolean;
}) {
  const [asking, setAsking] = useState(false);

  return (
    <div className="result">
      <h2>예약이 확정되었습니다</h2>
      <div className="receipt">
        <div className="when">{range(booking.startAt, booking.durationMin)}</div>
        <div className="who">
          {booking.hostName} · {ORG} · {booking.title} {booking.durationMin}분
        </div>
        {booking.meetingUrl && <a href={booking.meetingUrl}>{booking.meetingUrl}</a>}
      </div>
      <p>{email} 으로 캘린더 초대와 안내 메일을 보냈습니다.</p>
      <div className="row">
        {/* .ics 는 프런트에서 문자열로 만든다. 확정 응답이 이미 다 들고 있어서
            서버를 한 번 더 부를 이유가 없다. */}
        <button type="button" className="btn pri" onClick={() => downloadIcs(booking)}>
          캘린더에 추가
        </button>
      </div>

      {asking ? (
        <div className="row">
          <button type="button" className="btn pri" disabled={busy} onClick={onCancel}>
            {busy ? "취소하는 중" : "예약 취소"}
          </button>
          <button type="button" className="btn" onClick={() => setAsking(false)}>
            돌아가기
          </button>
        </div>
      ) : (
        <button type="button" className="linkish" onClick={() => setAsking(true)}>
          일정을 변경하거나 취소해야 하나요?
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  invalid?: boolean;
}) {
  const id = `f-${label}`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} *{hint && <span className="hint"> — {hint}</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid && <span className="err">이메일 주소를 다시 확인해 주세요.</span>}
    </div>
  );
}

function suspended(props: { hostName: string; hostEmail: string }) {
  return (
    <div className="result">
      <h2>지금은 예약을 받을 수 없습니다</h2>
      <div className="alert">
        <b>일시적인 문제로 예약이 중단되었습니다.</b>
        <p>
          {props.hostName} <a href={`mailto:${props.hostEmail}`}>{props.hostEmail}</a> 으로 연락
          주시면 직접 일정을 잡아드립니다.
        </p>
      </div>
    </div>
  );
}

function refetch(
  slug: string,
  from: string,
  to: string,
  setSlots: (s: number[]) => void,
): void {
  fetch(`/api/booking/${slug}/slots?from=${from}&to=${to}`)
    .then((r) => r.json())
    .then((body) => setSlots(body.slots ?? []))
    .catch(() => setSlots([]));
}

function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function shiftMonth(ymd: string, by: number): string {
  const [y, m] = ymd.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1 + by, 1));
  return shifted.toISOString().slice(0, 8) + "01";
}

function calendarCells(monthStart: string): ({ ymd: string; n: number } | null)[] {
  const [y, m] = monthStart.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => ({
      ymd: `${monthStart.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`,
      n: i + 1,
    })),
  ];
}

function downloadIcs(booking: Confirmed): void {
  const stamp = (ms: number) => {
    const { ymd, minutes } = kstFields(ms);
    return `${ymd.replace(/-/g, "")}T${toHhmm(minutes).replace(":", "")}00`;
  };
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//backpackr//booking//KO",
    "BEGIN:VEVENT",
    `UID:${booking.id}@backpac.kr`,
    `DTSTART;TZID=Asia/Seoul:${stamp(booking.startAt)}`,
    `DTEND;TZID=Asia/Seoul:${stamp(booking.startAt + booking.durationMin * 60_000)}`,
    `SUMMARY:${booking.title} — ${ORG}`,
    `LOCATION:${booking.meetingUrl ?? ""}`,
    `DESCRIPTION:${booking.hostName}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "meeting.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
