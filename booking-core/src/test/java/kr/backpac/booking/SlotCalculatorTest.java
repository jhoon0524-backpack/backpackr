package kr.backpac.booking;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/** handoff 4장 슬롯 계산 규칙을 하나씩 건다. 여기서 어긋나면 이중 부킹이 난다. */
class SlotCalculatorTest {

    // 2026-08-03 은 월요일이다.
    private static final LocalDate MON = LocalDate.of(2026, 8, 3);
    private static final LocalDate TUE = MON.plusDays(1);

    /** 리드타임에 걸리지 않도록 충분히 이른 "지금" */
    private static final LocalDateTime EARLY = LocalDateTime.of(2026, 8, 1, 0, 0);

    private static BookingPage page(int durationMin, BookingPage.Hours... monHours) {
        return new BookingPage("a7f3k2m9", durationMin,
                Map.of(DayOfWeek.MONDAY, List.of(monHours)), Set.of());
    }

    private static BookingPage.Hours hours(String start, String end) {
        return new BookingPage.Hours(LocalTime.parse(start), LocalTime.parse(end));
    }

    private static List<String> times(List<LocalDateTime> slots) {
        return slots.stream().map(s -> s.toLocalTime().toString()).toList();
    }

    private static List<LocalDateTime> slots(BookingPage page, LocalDate day, LocalDateTime now,
                                             List<LocalDateTime> booked, List<BusyPeriod> busy) {
        return SlotCalculator.availableSlots(page, day, day, now, booked, busy);
    }

    @Nested
    @DisplayName("1. 후보 생성")
    class CandidateGeneration {

        @Test
        @DisplayName("구간 시작점 기준으로 duration 간격이다 — 정시가 아니다")
        void alignsToRangeStart() {
            var p = page(30, hours("10:00", "12:00"));
            assertEquals(List.of("10:00", "10:30", "11:00", "11:30"),
                    times(slots(p, MON, EARLY, List.of(), List.of())));
        }

        @Test
        @DisplayName("구간이 10:15 에 시작하면 슬롯도 10:15·10:45·11:15 이다")
        void alignsToOffsetStart() {
            var p = page(30, hours("10:15", "11:45"));
            assertEquals(List.of("10:15", "10:45", "11:15"),
                    times(slots(p, MON, EARLY, List.of(), List.of())));
        }

        @Test
        @DisplayName("duration 이 남은 구간보다 길면 그 자리는 후보가 아니다")
        void dropsTailThatDoesNotFit() {
            var p = page(60, hours("10:00", "11:30"));
            assertEquals(List.of("10:00"), times(slots(p, MON, EARLY, List.of(), List.of())));
        }

        @Test
        @DisplayName("구간이 여러 개면 각각에서 따로 만든다")
        void handlesMultipleRanges() {
            var p = page(30, hours("10:00", "11:00"), hours("14:00", "15:00"));
            assertEquals(List.of("10:00", "10:30", "14:00", "14:30"),
                    times(slots(p, MON, EARLY, List.of(), List.of())));
        }

        @Test
        @DisplayName("운영시간이 없는 요일은 예약을 받지 않는다")
        void skipsDaysWithoutHours() {
            var p = page(30, hours("10:00", "12:00"));
            assertTrue(slots(p, TUE, EARLY, List.of(), List.of()).isEmpty());
        }

        @Test
        @DisplayName("blocked_dates 에 든 날은 통째로 빠진다")
        void skipsBlockedDates() {
            var p = new BookingPage("a7f3k2m9", 30,
                    Map.of(DayOfWeek.MONDAY, List.of(hours("10:00", "12:00"))), Set.of(MON));
            assertTrue(slots(p, MON, EARLY, List.of(), List.of()).isEmpty());
        }
    }

    @Nested
    @DisplayName("2. 리드타임")
    class LeadTime {

        @Test
        @DisplayName("지금 + 4시간 이전은 제거한다")
        void dropsSlotsInsideLeadTime() {
            var p = page(30, hours("10:00", "12:00"));
            var now = LocalDateTime.of(2026, 8, 3, 7, 15);   // 11:15 부터 가능
            assertEquals(List.of("11:30"), times(slots(p, MON, now, List.of(), List.of())));
        }

        @Test
        @DisplayName("정확히 4시간 뒤 슬롯은 남는다 — 경계는 포함이다")
        void keepsSlotExactlyAtBoundary() {
            var p = page(30, hours("10:00", "12:00"));
            var now = LocalDateTime.of(2026, 8, 3, 6, 0);    // 10:00 이 딱 경계
            assertEquals(List.of("10:00", "10:30", "11:00", "11:30"),
                    times(slots(p, MON, now, List.of(), List.of())));
        }
    }

    @Nested
    @DisplayName("3·4. 점유 구간 제외")
    class Occupied {

        @Test
        @DisplayName("활성 예약이 잡힌 시각은 빠진다")
        void dropsActiveBooking() {
            var p = page(30, hours("10:00", "12:00"));
            var booked = List.of(LocalDateTime.of(2026, 8, 3, 10, 30));
            assertEquals(List.of("10:00", "11:00", "11:30"),
                    times(slots(p, MON, EARLY, booked, List.of())));
        }

        @Test
        @DisplayName("캘린더 busy 와 겹치면 빠진다")
        void dropsBusyOverlap() {
            var p = page(30, hours("10:00", "12:00"));
            var busy = List.of(new BusyPeriod(
                    LocalDateTime.of(2026, 8, 3, 10, 45),
                    LocalDateTime.of(2026, 8, 3, 11, 15)));
            assertEquals(List.of("10:00", "11:30"),
                    times(slots(p, MON, EARLY, List.of(), busy)));
        }

        @Test
        @DisplayName("경계 접촉은 겹침이 아니다 — busy 가 끝나는 시각에 바로 예약할 수 있다")
        void touchingBoundaryIsNotOverlap() {
            var p = page(30, hours("10:00", "12:00"));
            var busy = List.of(new BusyPeriod(
                    LocalDateTime.of(2026, 8, 3, 10, 0),
                    LocalDateTime.of(2026, 8, 3, 10, 30)));
            assertEquals(List.of("10:30", "11:00", "11:30"),
                    times(slots(p, MON, EARLY, List.of(), busy)));
        }

        @Test
        @DisplayName("담당자가 캘린더에 넣은 블록이 곧 예약 불가 시간이다")
        void hostCalendarBlockRemovesSlots() {
            var p = page(30, hours("10:00", "12:00"));
            var block = List.of(new BusyPeriod(
                    LocalDateTime.of(2026, 8, 3, 10, 30),
                    LocalDateTime.of(2026, 8, 3, 11, 30)));
            assertEquals(List.of("10:00", "11:30"),
                    times(slots(p, MON, EARLY, List.of(), block)));
        }

        @Test
        @DisplayName("취소된 예약의 시각은 다시 슬롯으로 나온다")
        void canceledBookingReopensSlot() {
            var p = page(30, hours("10:00", "11:00"));
            var slot = LocalDateTime.of(2026, 8, 3, 10, 0);

            assertEquals(List.of("10:30"), times(slots(p, MON, EARLY, List.of(slot), List.of())));
            // 취소되면 활성 예약 목록(canceled_ref = 0)에서 빠진다
            assertEquals(List.of("10:00", "10:30"), times(slots(p, MON, EARLY, List.of(), List.of())));
        }
    }

    @Nested
    @DisplayName("조회 범위")
    class Window {

        @Test
        @DisplayName("여러 날을 한 번에 계산하고 오름차순으로 돌려준다")
        void spansMultipleDays() {
            var p = new BookingPage("a7f3k2m9", 60,
                    Map.of(DayOfWeek.MONDAY, List.of(hours("10:00", "11:00")),
                           DayOfWeek.TUESDAY, List.of(hours("14:00", "15:00"))), Set.of());
            var result = SlotCalculator.availableSlots(p, MON, TUE, EARLY, List.of(), List.of());
            assertEquals(List.of(
                    LocalDateTime.of(2026, 8, 3, 10, 0),
                    LocalDateTime.of(2026, 8, 4, 14, 0)), result);
        }

        @Test
        @DisplayName("예약 창 14일을 넘겨 요청하면 거절한다")
        void rejectsWindowOverflow() {
            var p = page(30, hours("10:00", "12:00"));
            assertThrows(IllegalArgumentException.class,
                    () -> SlotCalculator.availableSlots(p, MON, MON.plusDays(15), EARLY, List.of(), List.of()));
        }

        @Test
        @DisplayName("정확히 14일 범위는 통과한다")
        void allowsExactWindow() {
            var p = page(30, hours("10:00", "12:00"));
            assertDoesNotThrow(
                    () -> SlotCalculator.availableSlots(p, MON, MON.plusDays(14), EARLY, List.of(), List.of()));
        }

        @Test
        @DisplayName("to 가 from 보다 이르면 거절한다")
        void rejectsReversedRange() {
            var p = page(30, hours("10:00", "12:00"));
            assertThrows(IllegalArgumentException.class,
                    () -> SlotCalculator.availableSlots(p, MON, MON.minusDays(1), EARLY, List.of(), List.of()));
        }
    }
}
