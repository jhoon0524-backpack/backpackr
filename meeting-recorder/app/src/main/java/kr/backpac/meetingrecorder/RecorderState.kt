package kr.backpac.meetingrecorder

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** 녹음 파이프라인의 현재 단계. 서비스와 UI가 공유한다. */
sealed class RecorderPhase {
    data object Idle : RecorderPhase()
    data class Recording(val startedAtMillis: Long) : RecorderPhase()
    data class Processing(val step: String) : RecorderPhase()
    data class Done(val minutesFileName: String) : RecorderPhase()
    data class Error(val message: String) : RecorderPhase()
}

object RecorderState {
    private val _phase = MutableStateFlow<RecorderPhase>(RecorderPhase.Idle)
    val phase: StateFlow<RecorderPhase> = _phase

    fun update(phase: RecorderPhase) {
        _phase.value = phase
    }

    val isRecording: Boolean
        get() = _phase.value is RecorderPhase.Recording
}
