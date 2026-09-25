"""텀블벅 소개영상 배경음악 (직접 합성한 오리지널 곡, 저작권 걱정 없음)

120 BPM, 40초(20마디). 코드 진행: C - G - Am - F (밝고 희망찬 느낌)
 - 0~8초   : 잔잔한 인트로 (패드 + 벨 아르페지오), 끝에 상승음
 - 8~34초  : 킥·베이스·하이햇이 들어오는 본편
 - 34~40초 : 마지막 코드가 울리며 페이드아웃
"""
import wave
import numpy as np
from scipy.signal import lfilter

SR = 44100
BPM = 120
BEAT = 60 / BPM          # 0.5초
BAR = BEAT * 4           # 2초
TOTAL = 40.0
N = int(SR * TOTAL)

rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - pan) / 1.0
    R[i:i + len(sig)] += sig * gain * (1 + pan) / 1.0


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def env(n, attack, release):
    e = np.ones(n)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


# 코드 (MIDI 번호): C, G, Am, F
CHORDS = [
    [60, 64, 67],
    [59, 62, 67],
    [57, 60, 64],
    [57, 60, 65],
]
ROOTS = [36, 43, 45, 41]


def pad(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        f = midi(m)
        for det in (-0.12, 0.0, 0.12):
            ph = rng.random() * 2 * np.pi
            # 부드러운 톱니파 근사(배음 6개)
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * h * t * 2 ** (det / 12) + ph * h) / h
    s = lowpass(s, 1400) / (len(notes) * 3 * 2.5)
    return s * env(n, 0.6, 0.8)


def bell(m, dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.5)
         + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 9))
    return s * env(n, 0.004, 0.05)


def bass(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    s = np.tanh(1.5 * s) * np.exp(-t * 2.0)
    return s * env(n, 0.005, 0.03)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    freq = 50 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(ph) * np.exp(-t * 9)


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = x - lowpass(x, 7000)
    return x * np.exp(-t * (18 if open_ else 70))


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = lowpass(x, 3000) - lowpass(x, 900)
    e = np.exp(-t * 18)
    for d in (0.0, 0.012, 0.024):
        e += 0.6 * np.exp(-np.clip(t - d, 0, None) * 120) * (t >= d)
    return x * e


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = n // 16
    for k in range(16):  # 점점 밝아지는 노이즈
        cut = 400 + 7000 * (k / 15) ** 2
        s = slice(k * seg, (k + 1) * seg)
        out[s] = lowpass(x[s], cut)
    return out * (t / dur) ** 2


KICK, CLAP = kick(), clap()
HAT_C, HAT_O = hat(), hat(True)

# ARP 패턴(16분음표 대신 8분음표): 코드음을 위아래로
ARP = [0, 1, 2, 1, 0, 2, 1, 2]

for bar in range(20):
    t0 = bar * BAR
    ci = bar % 4
    chord = CHORDS[ci]
    final = bar >= 17

    # 패드: 인트로·본편 내내, 마지막은 길게 울림
    if bar < 17:
        add(pad(chord, BAR + 0.4), t0, 0.55)
    elif bar == 17:
        add(pad(CHORDS[0] + [72], 6.0), t0, 0.6)

    # 벨 아르페지오
    if not final:
        gain = 0.16 if bar < 4 else 0.20
        for k, idx in enumerate(ARP):
            note = chord[idx] + 12
            pan = -0.3 if k % 2 == 0 else 0.3
            add(bell(note), t0 + k * BEAT / 2, gain, pan)

    # 인트로 마지막 마디: 상승음
    if bar == 3:
        add(riser(BAR), t0, 0.35)

    # 본편: 킥 / 베이스 / 하이햇 / 클랩
    if 4 <= bar < 17:
        for b in range(4):
            add(KICK, t0 + b * BEAT, 0.9)
            add(HAT_C, t0 + b * BEAT + BEAT / 2, 0.22, 0.4)
            if b in (1, 3):
                add(CLAP, t0 + b * BEAT, 0.35)
        for k in range(8):
            add(bass(ROOTS[ci], BEAT / 2 - 0.01), t0 + k * BEAT / 2, 0.45)
        if bar == 16:  # 엔딩 직전 필인
            add(riser(BAR), t0, 0.25)

    # 엔딩 히트
    if bar == 17:
        add(KICK, t0, 1.0)
        add(HAT_O, t0, 0.3)
        add(bass(ROOTS[0], 3.0), t0, 0.5)
        for k, m in enumerate([72, 76, 79, 84]):
            add(bell(m, 3.0), t0 + k * 0.08, 0.2, (-0.3, 0.3)[k % 2])

# 마스터: 전체 페이드 인/아웃, 부드러운 리미터
t = np.arange(N) / SR
fade = np.clip(t / 0.3, 0, 1) * np.clip((TOTAL - t) / 3.0, 0, 1)
mix = np.stack([L, R], axis=1) * fade[:, None]
mix = np.tanh(mix * 1.1)
mix = mix / np.max(np.abs(mix)) * 0.89

with wave.open("music.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("music.wav 생성 완료", TOTAL, "초")
