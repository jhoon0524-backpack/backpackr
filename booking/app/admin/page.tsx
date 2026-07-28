/**
 * 담당자 화면 ① 의 첫 조각 — 로그인과 연동 상태만 있다.
 * 예약 유형 목록과 다가오는 예약(API 1)은 아직 없다.
 */
import { connection } from "@/lib/calendar";
import { host } from "@/lib/supabase";

import { DisconnectButton } from "./DisconnectButton";
import styles from "./admin.module.css";

const ERRORS: Record<string, string> = {
  login_failed: "로그인을 시작하지 못했습니다. 다시 시도해 주세요.",
  consent_denied: "구글 동의가 취소되었습니다.",
  no_code: "로그인에 실패했습니다. 다시 시도해 주세요.",
  exchange_failed: "로그인에 실패했습니다. 다시 시도해 주세요.",
  no_refresh_token: "구글이 갱신 토큰을 주지 않았습니다. 다시 로그인해 주세요.",
};

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await host();
  // 행이 있는지가 아니라 실제로 토큰이 먹히는지를 본다. 철회된 연동을
  // "연동됨" 으로 보여주면 담당자가 고칠 방법이 없다.
  const calendar = user ? await connection(user.id) : null;

  return (
    <div className={styles.page}>
      <h1>미팅 예약 링크</h1>

      {error && <p className={styles.error}>{ERRORS[error] ?? "알 수 없는 오류입니다."}</p>}

      {!user ? (
        <div className={styles.card}>
          <p className={styles.muted}>
            구글로 로그인하면 그 계정의 캘린더가 예약에 연결됩니다.
          </p>
          <a className={`${styles.button} ${styles.primary}`} href="/auth/login">
            구글로 로그인
          </a>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.row}>
            <span>{user.email}</span>
            <form action="/auth/logout" method="post">
              <button className={styles.button}>로그아웃</button>
            </form>
          </div>

          {calendar ? (
            <div className={styles.row}>
              <span className={styles.muted}>구글 캘린더 연동됨</span>
              <DisconnectButton />
            </div>
          ) : (
            <div className={styles.row}>
              <span className={styles.warn}>
                캘린더가 연동되지 않았습니다. 예약 페이지가 열리지 않습니다.
              </span>
              <a className={`${styles.button} ${styles.primary}`} href="/auth/login">
                연동하기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
