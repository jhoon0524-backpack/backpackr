package kr.backpac.booking;

import java.time.LocalDateTime;

/**
 * 예약자 취소 가능 판별 — handoff 코드 사다리 6단.
 *
 * <p>담당자 취소에는 시간 제한이 없다. 이 규칙은 공개 취소 링크(13번)에만 건다.
 */
public final class CancelPolicy {

    public static final int CANCEL_WINDOW_HOURS = 2;

    private CancelPolicy() {}

    public static boolean guestCancelable(LocalDateTime startAt, LocalDateTime now) {
        return startAt.minusHours(CANCEL_WINDOW_HOURS).isAfter(now);
    }
}
