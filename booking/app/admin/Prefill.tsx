"use client";

/**
 * 맞춤 예약 링크 — 아는 상대에게 보낼 때 이름·회사·연락처를 미리 채워 둔다.
 *
 * **서버가 하는 일이 없다.** 프리필은 쿼리 파라미터로만 오가고, 예약 확정은
 * 평소처럼 그 값을 본문으로 받는다. 그래서 이 화면은 문자열 조립이 전부다.
 */
import { useState } from "react";

import styles from "./admin.module.css";

const FIELDS = [
  ["name", "이름"],
  ["company", "회사명"],
  ["email", "이메일"],
  ["phone", "연락처"],
] as const;

export function Prefill({ url }: { url: string }) {
  const [values, setValues] = useState<Record<string, string>>({});

  const query = new URLSearchParams(
    Object.entries(values).filter(([, v]) => v.trim()) as [string, string][],
  ).toString();
  const link = query ? `${url}?${query}` : url;

  return (
    <>
      <div className={styles.fields}>
        {FIELDS.map(([key, label]) => (
          <div className={styles.field} key={key}>
            <label htmlFor={`p-${key}`}>{label}</label>
            <input
              id={`p-${key}`}
              value={values[key] ?? ""}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className={styles.link}>{link}</div>
      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => navigator.clipboard.writeText(link)}>
          맞춤 링크 복사
        </button>
      </div>
    </>
  );
}
