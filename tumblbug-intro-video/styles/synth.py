"""스타일 시안용 음악 합성 부품 (직접 합성, 외부 음원 없음)"""
import wave

import numpy as np
from scipy.signal import lfilter

SR = 44100
rng = np.random.default_rng(5)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    return lfilter([1 - a], [1, -a], x)


def env(n, attack, release):
    e = np.ones(n)
    a, r = max(1, int(attack * SR)), max(1, int(release * SR))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


class Track:
    def __init__(self, seconds):
        self.n = int(SR * seconds)
        self.L = np.zeros(self.n)
        self.R = np.zeros(self.n)

    def add(self, sig, start, gain=1.0, pan=0.0):
        i = int(start * SR)
        if i >= self.n:
            return
        sig = sig[: self.n - i]
        self.L[i:i + len(sig)] += sig * gain * (1 - pan)
        self.R[i:i + len(sig)] += sig * gain * (1 + pan)

    def save(self, path, fade_out=2.0):
        t = np.arange(self.n) / SR
        total = self.n / SR
        fade = np.clip(t / 0.05, 0, 1) * np.clip((total - t) / fade_out, 0, 1)
        mix = np.stack([self.L, self.R], axis=1) * fade[:, None]
        mix = np.tanh(mix * 1.1)
        mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
        with wave.open(path, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((mix * 32767).astype("<i2").tobytes())


# ---------- 악기 ----------
def pad(notes, dur, bright=1400):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        f = midi(m)
        for det in (-0.12, 0.0, 0.12):
            ph = rng.random() * 6.28
            for h in range(1, 7):
                s += np.sin(2 * np.pi * f * h * t * 2 ** (det / 12) + ph * h) / h
    return lowpass(s, bright) / (len(notes) * 7.5) * env(n, 0.5, 0.6)


def bell(m, dur=1.2, decay=3.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * decay)
         + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * decay * 1.7)
         + 0.12 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * decay * 2.6))
    return s * env(n, 0.004, 0.05)


def piano(m, dur=2.0):
    """부드러운 피아노 느낌(배음 + 느린 감쇠)"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    s = sum(np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t * (1.6 + h * 0.9)) / h ** 1.3
            for h in range(1, 7))
    return lowpass(s, 3000) * env(n, 0.006, 0.3)


def square(m, dur, duty=0.5, vol_decay=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = (midi(m) * t) % 1.0
    s = np.where(ph < duty, 1.0, -1.0) * np.exp(-t * vol_decay)
    return s * env(n, 0.002, 0.01)


def triangle(m, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = (midi(m) * t) % 1.0
    return (4 * np.abs(ph - 0.5) - 1) * env(n, 0.002, 0.01)


def bass(m, dur, drive=1.5, decay=2.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(drive * s) * np.exp(-t * decay) * env(n, 0.005, 0.03)


def saw_stab(notes, dur=0.25):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for m in notes:
        ph = (midi(m) * t) % 1.0
        s += 2 * ph - 1
    return lowpass(s / len(notes), 2500) * np.exp(-t * 9) * env(n, 0.003, 0.02)


def kick(punch=110, decay=9):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    freq = 50 + punch * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * decay)


def noise_hit(dur, lo, hi, decay):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = lowpass(x, hi) - lowpass(x, lo)
    return x * np.exp(-t * decay)


def hat():
    return noise_hit(0.05, 7000, 16000, 70)


def clap():
    return noise_hit(0.25, 900, 3000, 16)


def chip_noise(dur=0.08):
    n = int(dur * SR)
    t = np.arange(n) / SR
    step = 20  # 거친 8비트 노이즈
    x = np.repeat(rng.choice([-1.0, 1.0], n // step + 1), step)[:n]
    return x * np.exp(-t * 40)


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = n // 16
    for k in range(16):
        s = slice(k * seg, (k + 1) * seg)
        out[s] = lowpass(x[s], 400 + 7000 * (k / 15) ** 2)
    return out * (t / dur) ** 2
