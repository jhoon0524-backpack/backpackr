"use client";

/**
 * 화면 ① — 예약 유형 목록, 연동 상태, 다가오는 예약.
 *
 * 화면에 필요한 셋을 API 1 이 한 번에 준다. 연동 상태를 서버 컴포넌트에서
 * 따로 보지 않는 것도 그래서다 — 같은 걸 두 번 물으면 구글 토큰 갱신도 두 번이다.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { dateTime } from "@/lib/format";

import { CopyButton } from "./CopyButton";
import { Prefill } from "./Prefill";
import styles from "./admin.module.css";

export type AdminPage = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  durationMin: number;
  active: boolean;
  url: string;
};

type Upcoming = {
  id: string;
  pageTitle: string;
  startAt: number;
  guestName: string | null;
  guestCompany: string | null;
  guestEmail: string | null;
  syncError: string | null;
};

type Console1 = { calendarConnected: boolean; pages: AdminPage[]; upcoming: Upcoming[] };

const SYNC_LABEL: Record<string, string> = {
  MAIL: "메일 발송 실패",
  CAL_DELETE: "캘린더 삭제 실패",
};

export function Console({ email }: { email: string }) {
  const [data, setData] = useState<Console1 | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch("/admin/api/booking-pages")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));

  useEffect(() => {
    load();
  }, []);

  if (!data) return <p className={styles.muted}>불러오는 중입니다.</p>;

  return (
    <>
      <div className={styles.card}>
        <div className={styles.row}>
          <span>{email}</span>
          {data.calendarConnected ? (
            <div className={styles.actions}>
              <span className={styles.muted}>구글 캘린더 연동됨</span>
              <button
                className={styles.btn}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await fetch("/admin/api/calendar", { method: "DELETE" });
                  await load();
                  setBusy(false);
                }}
              >
                연동 해제
              </button>
            </div>
          ) : (
            <div className={styles.actions}>
              <span className={styles.warn}>
                캘린더가 연동되지 않았습니다. 예약 페이지가 열리지 않습니다.
              </span>
              <a className={`${styles.btn} ${styles.pri}`} href="/auth/login">
                연동하기
              </a>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.section}>예약 유형</span>
          <Link className={`${styles.btn} ${styles.pri}`} href="/admin/pages/new">
            새 예약 유형
          </Link>
        </div>

        {data.pages.length === 0 ? (
          <p className={styles.muted}>아직 예약 유형이 없습니다.</p>
        ) : (
          <div className={styles.list}>
            {data.pages.map((page) => (
              <Item key={page.id} page={page} onChange={load} />
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.section}>다가오는 예약</span>
        {data.upcoming.length === 0 ? (
          <p className={styles.muted}>예정된 예약이 없습니다.</p>
        ) : (
          <div className={styles.list}>
            {data.upcoming.map((booking) => (
              <div className={styles.item} key={booking.id}>
                <div className={styles.row}>
                  <span className={styles.when}>{dateTime(booking.startAt)}</span>
                  {booking.syncError && (
                    <span className={styles.badge}>
                      {booking.syncError
                        .split(",")
                        .map((code) => SYNC_LABEL[code] ?? code)
                        .join(" · ")}
                    </span>
                  )}
                </div>
                <div className={styles.muted}>
                  {booking.pageTitle} · {booking.guestName ?? "이름 없음"}
                  {booking.guestCompany && ` · ${booking.guestCompany}`}
                  {booking.guestEmail && ` · ${booking.guestEmail}`}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.btn}
                    onClick={async () => {
                      if (!confirm("이 예약을 취소할까요? 예약자에게 취소가 전달됩니다.")) return;
                      await fetch(`/admin/api/bookings/${booking.id}`, { method: "DELETE" });
                      await load();
                    }}
                  >
                    예약 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Item({ page, onChange }: { page: AdminPage; onChange: () => void }) {
  const [showPrefill, setShowPrefill] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={`${styles.item} ${page.active ? "" : styles.off}`}>
      <div className={styles.row}>
        <h3>
          {page.title} <span className={styles.muted}>{page.durationMin}분</span>
        </h3>
        {!page.active && <span className={styles.muted}>비활성</span>}
      </div>

      <div className={styles.link}>{page.url}</div>

      <div className={styles.actions}>
        <CopyButton text={page.url} label="링크 복사" />
        <button className={styles.btn} onClick={() => setShowPrefill(!showPrefill)}>
          맞춤 링크
        </button>
        <Link className={styles.btn} href={`/admin/pages/${page.id}`}>
          수정
        </Link>
        <button
          className={styles.btn}
          onClick={async () => {
            if (!confirm(`"${page.title}" 을 삭제할까요?`)) return;
            const res = await fetch(`/admin/api/booking-pages/${page.id}`, { method: "DELETE" });
            if (res.ok) onChange();
            else setFailed(true);
          }}
        >
          삭제
        </button>
      </div>

      {failed && (
        <p className={styles.warn}>
          다가오는 예약이 있어 삭제할 수 없습니다. 예약을 먼저 취소해 주세요.
        </p>
      )}

      {showPrefill && <Prefill url={page.url} />}
    </div>
  );
}
