/** 담당자 화면 ① — 로그인 게이트와 콘솔. */
import { host } from "@/lib/supabase";

import { Console } from "./Console";
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

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1>미팅 예약 링크</h1>
        {user && (
          <form action="/auth/logout" method="post">
            <button className={styles.btn}>로그아웃</button>
          </form>
        )}
      </div>

      {error && <p className={styles.error}>{ERRORS[error] ?? "알 수 없는 오류입니다."}</p>}

      {user ? (
        <Console email={user.email ?? ""} />
      ) : (
        <div className={styles.card}>
          <p className={styles.muted}>
            구글로 로그인하면 그 계정의 캘린더가 예약에 연결됩니다.
          </p>
          <div>
            <a className={`${styles.btn} ${styles.pri}`} href="/auth/login">
              구글로 로그인
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
