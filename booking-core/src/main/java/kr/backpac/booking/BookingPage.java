package kr.backpac.booking;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 예약 유형. booking_page 행에 대응한다.
 *
 * <p>weekly_hours 는 요일별 운영 구간 배열이고, 없는 요일은 예약을 받지 않는다.
 * lead_time_hours · window_days 는 컬럼이 아니라 상수다 — handoff 코드 사다리 1단.
 */
public record BookingPage(
        String slug,
        int durationMin,
        Map<DayOfWeek, List<Hours>> weeklyHours,
        Set<LocalDate> blockedDates
) {
    /** 운영 구간 하나. [start, end) */
    public record Hours(LocalTime start, LocalTime end) {}
}
