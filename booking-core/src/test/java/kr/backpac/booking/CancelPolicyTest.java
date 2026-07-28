package kr.backpac.booking;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 예약자 취소는 미팅 2시간 전까지. 담당자 취소에는 제한이 없다. */
class CancelPolicyTest {

    private static final LocalDateTime MEETING = LocalDateTime.of(2026, 8, 3, 14, 0);

    @Test
    @DisplayName("2시간보다 여유가 있으면 취소할 수 있다")
    void allowsBeforeWindow() {
        assertTrue(CancelPolicy.guestCancelable(MEETING, MEETING.minusHours(2).minusMinutes(1)));
    }

    @Test
    @DisplayName("정확히 2시간 전이면 이미 닫힌다 — isAfter 라 경계는 제외다")
    void closesExactlyAtBoundary() {
        assertFalse(CancelPolicy.guestCancelable(MEETING, MEETING.minusHours(2)));
    }

    @Test
    @DisplayName("2시간 안쪽이면 닫힌다")
    void blocksInsideWindow() {
        assertFalse(CancelPolicy.guestCancelable(MEETING, MEETING.minusMinutes(90)));
    }

    @Test
    @DisplayName("이미 지난 미팅도 닫힌다")
    void blocksPastMeeting() {
        assertFalse(CancelPolicy.guestCancelable(MEETING, MEETING.plusHours(1)));
    }
}
