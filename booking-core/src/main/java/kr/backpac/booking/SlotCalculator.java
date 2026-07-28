package kr.backpac.booking;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 공개 슬롯 계산 — handoff 4장. 10번 엔드포인트의 전부다.
 *
 * <p>시각은 전부 KST 로컬로 다룬다. 타임존 변환을 넣지 않는다.
 */
public final class SlotCalculator {

    public static final int LEAD_TIME_HOURS = 4;
    public static final int WINDOW_DAYS = 14;

    private SlotCalculator() {}

    /**
     * @param activeBookings 활성 예약의 start_at (canceled_ref = 0)
     * @param busy           freebusy 로 받은 담당자 캘린더의 바쁨 구간
     * @return 예약 가능한 슬롯 시작 시각. 오름차순
     */
    public static List<LocalDateTime> availableSlots(
            BookingPage page,
            LocalDate from,
            LocalDate to,
            LocalDateTime now,
            List<LocalDateTime> activeBookings,
            List<BusyPeriod> busy
    ) {
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("to 가 from 보다 이르다: " + from + " ~ " + to);
        }
        if (from.plusDays(WINDOW_DAYS).isBefore(to)) {
            throw new IllegalArgumentException("예약 창 " + WINDOW_DAYS + "일을 넘었다: " + from + " ~ " + to);
        }

        Duration duration = Duration.ofMinutes(page.durationMin());
        LocalDateTime earliest = now.plusHours(LEAD_TIME_HOURS);

        // 3. 점유 구간 수집 — 활성 예약과 캘린더 busy 를 한 목록으로 합친다.
        //    나눠 두면 겹침 판정이 두 벌이 되어 한쪽만 고치는 실수가 난다.
        List<BusyPeriod> occupied = new ArrayList<>(busy);
        for (LocalDateTime booked : activeBookings) {
            occupied.add(new BusyPeriod(booked, booked.plus(duration)));
        }

        List<LocalDateTime> slots = new ArrayList<>();

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (page.blockedDates().contains(date)) continue;

            List<BookingPage.Hours> hours = page.weeklyHours().get(date.getDayOfWeek());
            if (hours == null) continue;   // 운영하지 않는 요일

            for (BookingPage.Hours h : hours) {
                // 1. 후보 생성 — 구간 시작점 기준으로 duration 간격
                for (LocalTime t = h.start(); !t.plus(duration).isAfter(h.end()); t = t.plus(duration)) {
                    LocalDateTime slotStart = LocalDateTime.of(date, t);
                    LocalDateTime slotEnd = slotStart.plus(duration);

                    // 2. 리드타임 제외
                    if (slotStart.isBefore(earliest)) continue;

                    // 4. 겹침 제외 — 경계 접촉은 겹침이 아니다
                    if (overlapsAny(slotStart, slotEnd, occupied)) continue;

                    slots.add(slotStart);
                }
            }
        }

        slots.sort(null);
        return slots;
    }

    private static boolean overlapsAny(LocalDateTime start, LocalDateTime end, List<BusyPeriod> occupied) {
        for (BusyPeriod p : occupied) {
            if (start.isBefore(p.end()) && p.start().isBefore(end)) return true;
        }
        return false;
    }
}
