package kr.backpac.booking;

import java.time.LocalDateTime;

/**
 * freebusy 응답의 바쁨 구간 하나. [start, end)
 *
 * <p>겹침 판정 메서드를 두지 않는다 — handoff 코드 사다리 3단에서 Interval·Range 클래스를
 * 만들지 않기로 했다. 판정은 {@link SlotCalculator} 한 곳에서 LocalDateTime 비교로 한다.
 */
public record BusyPeriod(LocalDateTime start, LocalDateTime end) {}
