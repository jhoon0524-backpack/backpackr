"use client";

/**
 * 복사 버튼 — **눌린 것이 보여야 한다.**
 *
 * `navigator.clipboard.writeText` 는 성공해도 화면이 그대로다. 복사됐다는 표시가
 * 없으면 담당자는 버튼이 죽은 줄 알고 링크를 붙여넣어 보지도 않는다. 실패도
 * 조용하다 — 권한을 거부했거나 보안 컨텍스트가 아니면 promise 가 거절될 뿐이라
 * 성공과 화면이 똑같다. 둘을 라벨로 갈라 말한다.
 *
 * 실패했을 때 다른 복사 방법을 붙이지 않는다. 링크가 바로 위에 그대로 떠 있어서
 * 손으로 긁어 복사할 수 있다 — 알아야 할 것은 "안 됐다" 하나다.
 */
import { useState } from "react";

import styles from "./admin.module.css";

const RESET_MS = 2000;

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  return (
    <button
      className={styles.btn}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("done");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), RESET_MS);
      }}
    >
      {state === "done" ? "복사됨" : state === "failed" ? "복사 실패" : label}
    </button>
  );
}
