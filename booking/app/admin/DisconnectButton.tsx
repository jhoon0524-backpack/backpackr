"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./admin.module.css";

export function DisconnectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      className={styles.button}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/admin/api/calendar", { method: "DELETE" });
        router.refresh();
        setBusy(false);
      }}
    >
      {busy ? "해제하는 중" : "연동 해제"}
    </button>
  );
}
