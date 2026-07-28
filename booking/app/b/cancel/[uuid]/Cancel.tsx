"use client";

import { useState } from "react";

import { range } from "@/lib/format";

export function Cancel(props: {
  id: string;
  startAt: number;
  durationMin: number;
  title: string;
  hostName: string;
  hostEmail: string;
  canceled: boolean;
  cancelable: boolean;
}) {
  const [done, setDone] = useState(props.canceled);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className="stage">
      <div className="card">
        <div className="result">{body()}</div>
      </div>
    </div>
  );

  function body() {
    if (done) {
      return (
        <>
          <h2>예약이 취소되었습니다</h2>
          <p>해당 시간은 다시 예약 가능한 슬롯으로 열렸습니다.</p>
        </>
      );
    }

    // 미팅 2시간 전이 지나면 온라인 취소를 막는다. 담당자가 이미 이동 중일 수 있다.
    if (!props.cancelable) {
      return (
        <>
          <h2>온라인 취소가 어렵습니다</h2>
          <div className="alert">
            <b>미팅 시작 2시간 전이 지났습니다.</b>
            <p>
              {props.hostName} · <a href={`mailto:${props.hostEmail}`}>{props.hostEmail}</a> 으로
              연락 주시면 바로 처리해 드립니다.
            </p>
          </div>
          <div className="receipt">
            <div className="when">{range(props.startAt, props.durationMin)}</div>
            <div className="who">
              {props.hostName} · {props.title}
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <h2>예약을 취소하시겠습니까?</h2>
        <div className="receipt">
          <div className="when">{range(props.startAt, props.durationMin)}</div>
          <div className="who">
            {props.hostName} · {props.title}
          </div>
        </div>
        {failed && (
          <div className="alert">
            <b>취소하지 못했습니다.</b>
            <p>잠시 후 다시 시도해 주세요.</p>
          </div>
        )}
        <div className="row">
          <button
            type="button"
            className="btn pri"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setFailed(false);
              const res = await fetch(`/api/bookings/${props.id}`, { method: "DELETE" });
              setBusy(false);
              if (res.ok) setDone(true);
              else setFailed(true);
            }}
          >
            {busy ? "취소하는 중" : "예약 취소"}
          </button>
        </div>
      </>
    );
  }
}
