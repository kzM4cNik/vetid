"""Синтез UI-звуков приложения (клик, сканирование, успех, отказ).

Запуск: python scripts/gen_sounds.py
"""
import math
import os
import random
import struct
import wave

RATE = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def write(name, samples):
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = 0.85 / peak
    with wave.open(os.path.join(OUT, name), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s * scale * 32767)) for s in samples))


def env(t, dur, attack=0.005, release=0.05):
    if t < attack:
        return t / attack
    if t > dur - release:
        return max(0.0, (dur - t) / release)
    return 1.0


def tone(freq, dur, vol=1.0, attack=0.005, release=0.05, harmonics=(1.0,)):
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        s = sum(a * math.sin(2 * math.pi * freq * (k + 1) * t) for k, a in enumerate(harmonics))
        out.append(s * vol * env(t, dur, attack, release))
    return out


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return [sum(t[i] for t in tracks if i < len(t)) for i in range(n)]


def pad(samples, seconds):
    return [0.0] * int(RATE * seconds) + samples


def tap():
    dur = 0.045
    n = int(RATE * dur)
    out = []
    for i in range(n):
        t = i / RATE
        e = math.exp(-t * 140)
        out.append((math.sin(2 * math.pi * 1800 * t) * 0.7 + math.sin(2 * math.pi * 3400 * t) * 0.3) * e)
    return out


def scan():
    dur = 1.6
    n = int(RATE * dur)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / RATE
        f = 320 + 900 * (t / dur) ** 1.6
        phase += 2 * math.pi * f / RATE
        wob = 0.5 + 0.5 * math.sin(2 * math.pi * 14 * t)
        s = math.sin(phase) * 0.5 + math.sin(phase * 2.01) * 0.2 * wob
        out.append(s * env(t, dur, 0.08, 0.25) * 0.6)
    blips = []
    for k in range(8):
        blips = mix(blips or [0.0], pad(tone(1400 + k * 120, 0.03, 0.35, 0.002, 0.02), 0.12 + k * 0.17))
    return mix(out, blips)


def success():
    notes = [(784, 0.0), (1047, 0.09), (1319, 0.18), (1568, 0.27)]
    parts = [pad(tone(f, 0.45, 0.5, 0.004, 0.35, (1.0, 0.35, 0.12)), d) for f, d in notes]
    return mix(*parts)


def denied():
    a = tone(180, 0.22, 0.9, 0.005, 0.04, (1.0, 0.5, 0.33, 0.25, 0.2))
    b = pad(tone(140, 0.32, 0.9, 0.005, 0.08, (1.0, 0.5, 0.33, 0.25, 0.2)), 0.28)
    return mix(a, b)


def ready():
    return mix(tone(1175, 0.12, 0.5, 0.003, 0.08), pad(tone(1760, 0.18, 0.4, 0.003, 0.14), 0.08))


if __name__ == "__main__":
    random.seed(1)
    os.makedirs(OUT, exist_ok=True)
    write("tap.wav", tap())
    write("scan.wav", scan())
    write("success.wav", success())
    write("denied.wav", denied())
    write("ready.wav", ready())
    print("ok")
