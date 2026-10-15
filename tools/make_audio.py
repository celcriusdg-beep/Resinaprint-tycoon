#!/usr/bin/env python3
"""Synthesises the Resinaprint sound effects and music loops (numpy), then encodes them to mp3 with ffmpeg.
Run:  python3 tools/make_audio.py   (writes audio/*.mp3)"""
import numpy as np, subprocess, os, wave, tempfile
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def t_(d): return np.arange(int(SR * d)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def exp_env(n, tau): return np.exp(-np.arange(n) / SR / tau)
def adsr(n, a, d, s, r):
    e = np.ones(n); a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    e[:a_n] = np.linspace(0, 1, max(a_n, 1))
    e[a_n:a_n + d_n] = np.linspace(1, s, max(d_n, 1))[:max(0, n - a_n)][:len(e[a_n:a_n + d_n])]
    e[a_n + d_n:] = s
    if r_n: e[-r_n:] *= np.linspace(1, 0, r_n)
    return e
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def noise(d): return rng.standard_normal(int(SR * d))
def sine(f, d, ph=0): t = t_(d); return np.sin(2 * np.pi * f * t + ph)
def fm(f, d, ratio=2.0, idx=3.0, tau=.35, itau=.2):
    t = t_(d); mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t / itau)
    return np.sin(2 * np.pi * f * t + mod) * np.exp(-t / tau)
def bell(f, d, tau=.5):
    t = t_(d); x = np.zeros_like(t)
    for r, a, k in [(1, 1, 1), (2.76, .5, .6), (5.4, .25, .35), (8.93, .12, .2)]:
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (tau * k))
    return x
def saw(f, d, detune=0.0):
    t = t_(d); return 2 * ((t * f * (1 + detune)) % 1) - 1
def place(buf, x, at, gain=1.0):
    i = int(at * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n] * gain
def reverb(x, rt=1.2, wet=.25, damp=4500):
    n = int(SR * rt); ir = noise(rt) * np.exp(-np.arange(n) / SR / (rt / 4.5))
    ir = lp(ir, damp); ir[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    w = signal.fftconvolve(x, ir)[:len(x) + n // 2]
    y = np.zeros(len(w)); y[:len(x)] += x * (1 - wet); y += w * wet * 1.4
    return y
def sat(x, k=1.5): return np.tanh(x * k) / np.tanh(k)
def norm(x, peak=.8):
    m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def fade(x, a=.004, r=.02):
    x = x.copy(); na, nr = int(a * SR), int(r * SR)
    x[:na] *= np.linspace(0, 1, na); x[-nr:] *= np.linspace(1, 0, nr); return x
def sweep(f0, f1, d, curve='exp'):
    t = t_(d)
    ph = 2 * np.pi * (f0 * d * (( (f1 / f0) ** (t / d) - 1) / np.log(f1 / f0))) if curve == 'exp' else 2 * np.pi * (f0 * t + (f1 - f0) * t * t / (2 * d))
    return np.sin(ph)
def whoosh(d, f0, f1, peak=.5):
    n = noise(d); t = t_(d); out = np.zeros_like(n); steps = 24
    for i in range(steps):
        a, b = int(i / steps * len(n)), int((i + 1) / steps * len(n))
        c = f0 * (f1 / f0) ** ((i + .5) / steps)
        out[a:b] = bp(n, max(80, c * .6), min(18000, c * 1.5))[a:b]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return out * env * peak
def mono_to_stereo(x, width=.0):
    if width <= 0: return np.stack([x, x], 1)
    d = int(.0006 * SR * (1 + width * 6)); l = x; r = np.concatenate([np.zeros(d), x[:-d]])
    return np.stack([l, r], 1)

def save(name, x, bitrate='96k', stereo=False, peak=.85):
    x = norm(x, peak); x = x if x.ndim == 2 else mono_to_stereo(x, .35 if stereo else 0)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: path = f.name
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-codec:a', 'libmp3lame', '-b:a', bitrate, '-ar', '44100', out], check=True)
    os.remove(path); print(name, os.path.getsize(out) // 1024, 'KB', round(len(x) / SR, 2), 's')

# ------------------------------------------------------------------ effects
def fx_tap():
    n = int(.09 * SR); x = np.zeros(n)
    c = bp(noise(.02), 1800, 5200) * exp_env(int(.02 * SR), .004); x[:len(c)] += c * .9
    x += sine(760, .09) * exp_env(n, .012) * .5
    x += sine(1520, .09) * exp_env(n, .006) * .15
    return fade(x)
def fx_select():
    x = fm(880, .16, 1, 1.5, .05, .04) * .8 + fm(1320, .16, 1, 1.2, .04, .03) * .35
    return fade(reverb(x, .35, .15))
def fx_on():
    x = np.zeros(int(.3 * SR)); place(x, fm(660, .18, 1, 1.2, .06), 0); place(x, fm(990, .22, 1, 1.2, .08), .07); return fade(reverb(x, .4, .15))
def fx_off():
    x = np.zeros(int(.3 * SR)); place(x, fm(990, .18, 1, 1.2, .06), 0); place(x, fm(620, .22, 1, 1.2, .08), .07); return fade(reverb(x, .4, .12))
def fx_coin():
    x = np.zeros(int(.9 * SR)); place(x, bell(1568, .6, .35), 0, .8); place(x, bell(2093, .8, .42), .075, 1)
    place(x, hp(noise(.03), 6000) * exp_env(int(.03 * SR), .006), 0, .25)
    return fade(reverb(x, .7, .22), r=.08)
def fx_cash():
    x = np.zeros(int(1.4 * SR))
    for i, n in enumerate([76, 83, 88, 95]): place(x, bell(midi(n), .8, .35), i * .06, .75)
    place(x, hp(noise(.12), 5000) * exp_env(int(.12 * SR), .03), 0, .35)
    place(x, bell(midi(100), 1.0, .6), .25, .5)
    return fade(reverb(x, 1.0, .25), r=.1)
def fx_good():
    x = np.zeros(int(.9 * SR)); place(x, bell(midi(81), .6, .3), 0, .7); place(x, bell(midi(85), .7, .35), .09, .8); return fade(reverb(x, .6, .2), r=.08)
def fx_bad():
    n = int(.5 * SR); x = np.zeros(n)
    x += sweep(190, 95, .5) * exp_env(n, .16) * .9
    x += lp(noise(.5), 500) * exp_env(n, .05) * .5
    x += lp(saw(110, .5), 400) * exp_env(n, .18) * .25
    return fade(sat(x, 1.8))
def fx_level():
    x = np.zeros(int(2.4 * SR))
    for i, n in enumerate([72, 76, 79, 84, 88]): place(x, fm(midi(n), 1.2, 2, 2.2, .5, .25) * .8 + bell(midi(n + 12), 1.2, .4) * .25, i * .11, .7)
    place(x, whoosh(.7, 400, 6000, .25), 0, .6)
    ch = np.zeros(int(2.4 * SR))
    for n in (72, 76, 79, 84): place(ch, lp(saw(midi(n), 1.6, .003), 2400) * adsr(int(1.6 * SR), .05, .2, .5, .8) * .12, .5)
    return fade(reverb(x + ch, 1.9, .3), r=.3)
def fx_chest_shake():
    x = np.zeros(int(1.0 * SR))
    for i in range(7):
        at = i * .125 + (.02 if i % 2 else 0); g = .35 + i * .1; f = 110 - i * 4
        k = lp(noise(.12), 700) * exp_env(int(.12 * SR), .03) + sine(f, .12) * exp_env(int(.12 * SR), .04) * .9
        place(x, k, at, g)
        place(x, bp(noise(.04), 1200, 3800) * exp_env(int(.04 * SR), .008), at, .15 + i * .02)
    place(x, lp(whoosh(.9, 200, 1800, .3), 3000), 0, .25)
    return fade(reverb(x, .5, .12), r=.05)
def chest_open(tier):
    d = 3.2 if tier == 2 else 2.4 if tier == 1 else 1.6
    x = np.zeros(int(d * SR))
    place(x, whoosh(.55, 300, 7000, .6), 0, .8)
    t0 = .45
    place(x, sweep(95, 38, 1.0) * exp_env(int(1.0 * SR), .35) * (1 if tier else .6), t0, .9)
    place(x, lp(noise(.25), 1200) * exp_env(int(.25 * SR), .06), t0, .5)
    notes = [[74, 81, 86], [72, 76, 79, 84, 88], [69, 76, 81, 85, 88, 93]][tier]
    for i, n in enumerate(notes): place(x, bell(midi(n), 1.4 + tier * .3, .55) * .7, t0 + .05 + i * .07, .7)
    if tier >= 1:
        ch = np.zeros(int(d * SR))
        for n in ([60, 64, 67, 72] if tier == 1 else [57, 64, 69, 72, 76, 81]):
            seg = (saw(midi(n), 2.0, .004) + saw(midi(n), 2.0, -.004)) * .5
            place(ch, lp(seg, 1800 + tier * 900) * adsr(int(2.0 * SR), .25, .3, .6, .9), t0, .09)
        x += ch
    if tier == 2:
        for i in range(30): place(x, bell(midi(96 + (i % 8)) , .5, .2) * .25, t0 + .3 + i * .06, .5)
        place(x, hp(noise(1.5), 5000) * exp_env(int(1.5 * SR), .5), t0, .12)
    return fade(reverb(x, 1.6 + tier * .6, .28 + tier * .06), r=.4)
def fx_print_done():
    x = np.zeros(int(.8 * SR)); place(x, fm(1320, .5, 1, 1.0, .2, .1), 0, .6); place(x, fm(1760, .6, 1, 1.0, .25, .1), .12, .6)
    return fade(reverb(x, .5, .18), r=.1)
def fx_pack():
    n = int(.3 * SR); x = np.zeros(n)
    x += lp(noise(.3), 380) * exp_env(n, .045) * 1.0
    x += sweep(150, 70, .3) * exp_env(n, .06) * .8
    c = bp(noise(.06), 1500, 4500) * exp_env(int(.06 * SR), .012); x[:len(c)] += c * .35
    return fade(x)
def fx_send():
    x = np.zeros(int(1.2 * SR))
    place(x, whoosh(.9, 200, 2400, .5), .05, .8)
    t = t_(.9); eng = lp(saw(55, .9) + .5 * saw(110.6, .9), 520) * (np.sin(np.pi * t / .9) ** 1.2) * (1 + .25 * np.sin(2 * np.pi * 22 * t))
    place(x, eng, 0, .6)
    place(x, bell(midi(88), .6, .25), .0, .25)
    return fade(reverb(x, .6, .12), r=.15)
def fx_forge():
    x = np.zeros(int(3.0 * SR))
    place(x, sweep(70, 28, 1.6) * exp_env(int(1.6 * SR), .55), 0, 1.0)
    place(x, lp(noise(.6), 900) * exp_env(int(.6 * SR), .12), 0, .6)
    for r, a in [(1, 1), (2.32, .6), (3.74, .5), (5.13, .3)]: place(x, sine(180 * r, 2.5) * exp_env(int(2.5 * SR), 1.1 / r) * .35 * a, .02, 1)
    place(x, whoosh(.7, 3000, 180, .4), .0, .6)
    for i in range(16): place(x, bell(midi(88 + (i * 3) % 12), .6, .22) * .22, .4 + i * .08, .6)
    return fade(sat(reverb(x, 2.2, .3), 1.3), r=.5)
def fx_glitch():
    n = int(.55 * SR); x = np.zeros(n)
    seg = 0
    while seg < n:
        l = int(rng.uniform(.015, .06) * SR); f = rng.choice([220, 330, 440, 880, 1320, 55])
        s = np.sign(np.sin(2 * np.pi * f * np.arange(l) / SR)) * .6 + noise(l / SR) * .3 * rng.uniform(0, 1)
        if rng.random() < .35: s = np.round(s * 4) / 4
        x[seg:seg + l] += s[:min(l, n - seg)] if seg + l <= n else s[:n - seg]; seg += l + int(rng.uniform(0, .02) * SR)
    x *= exp_env(n, .3)
    return fade(sat(x, 1.4))
def fx_perk():
    x = np.zeros(int(1.6 * SR))
    for i, n in enumerate([81, 84, 88, 93, 96]): place(x, bell(midi(n), .7, .35) * .8, i * .06, .8)
    place(x, lp(saw(midi(57), 1.2, .003), 1400) * adsr(int(1.2 * SR), .1, .2, .5, .6), 0, .15)
    return fade(reverb(x, 1.2, .28), r=.25)
def fx_rival():
    x = np.zeros(int(1.2 * SR))
    for i, n in enumerate([55, 58]): place(x, lp(saw(midi(n), .9, .004) + saw(midi(n), .9, -.004), 900) * adsr(int(.9 * SR), .03, .2, .55, .4), i * .22, .5)
    place(x, sweep(120, 55, .5) * exp_env(int(.5 * SR), .15), 0, .7)
    return fade(sat(reverb(x, .8, .18), 1.6), r=.2)
def fx_unstable():
    t = t_(1.2); x = np.zeros_like(t)
    for f in (110, 164.8, 233): x += np.sin(2 * np.pi * f * t + 3 * np.sin(2 * np.pi * 5.5 * t)) * .3
    x *= np.sin(np.pi * t / 1.2) ** .8
    x += hp(noise(1.2), 4000) * .05 * (rng.random(len(t)) > .7)
    return fade(sat(x, 1.5), r=.2)
def fx_notify():
    x = np.zeros(int(1.0 * SR)); place(x, bell(midi(79), .7, .3), 0, .7); place(x, bell(midi(86), .9, .4), .14, .8); return fade(reverb(x, .7, .2), r=.15)
def fx_buy():
    x = np.zeros(int(1.0 * SR)); place(x, bell(midi(84), .6, .25), 0, .7); place(x, bell(midi(91), .8, .35), .06, .8)
    place(x, hp(noise(.05), 4000) * exp_env(int(.05 * SR), .012), 0, .25)
    return fade(reverb(x, .5, .18), r=.1)
def fx_whoosh():
    return fade(whoosh(.5, 400, 4000, .8))

# ------------------------------------------------------------------ music
def rhodes(f, d, vel=1.0):
    t = t_(d); x = np.zeros_like(t)
    x += fm(f, d, 1, 1.6 * vel, 1.1, .35) * 1.0
    x += fm(f * 2.0, d, 1, 0.5, .5, .12) * .25
    return x * (1 - np.exp(-t / .004))
def kick(): n = int(.38 * SR); return sweep(130, 42, .38) * exp_env(n, .11) * 1.0
def snare():
    n = int(.3 * SR); return (bp(noise(.3), 1200, 7500) * exp_env(n, .07) * .8 + sine(190, .3) * exp_env(n, .045) * .5)
def hat(o=False):
    n = int((.25 if o else .07) * SR); return hp(noise(n / SR), 7500) * exp_env(n, .09 if o else .018) * .45
def lofi_chain(x):
    x = lp(x, 6500, 2); x = sat(x, 1.35)
    t = t_(len(x) / SR); wob = 1 + 0.0016 * np.sin(2 * np.pi * .35 * t) + 0.0008 * np.sin(2 * np.pi * 5.1 * t)
    idx = np.clip(np.arange(len(x)) * wob, 0, len(x) - 1); x = np.interp(idx, np.arange(len(x)), x)
    cr = (rng.random(len(x)) > .9993) * rng.standard_normal(len(x)) * .25 + hp(noise(len(x) / SR), 3000) * .006
    return x + cr
def music_lofi():
    bpm = 78; beat = 60 / bpm; bars = 16; total = bars * 4 * beat; tail = 3.0
    buf = np.zeros(int((total + tail) * SR)); sw = .08 * beat
    prog = [([53, 57, 60, 64], 41), ([52, 55, 59, 62], 40), ([50, 53, 57, 60], 38), ([48, 52, 55, 59], 36)]  # Fmaj7 Em7 Dm7 Cmaj7
    for bar in range(bars):
        ch, bass = prog[(bar // 2) % 4]; t0 = bar * 4 * beat
        voicing = [n + (12 if (bar // 8) and i == 3 else 0) for i, n in enumerate(ch)]
        hits = [(0, 1.5), (1.5, 1.0), (2.5, 1.5)] if bar % 2 == 0 else [(0, 1.0), (1.0, 1.5), (2.5, 1.5)]
        for at, ln in hits:
            for i, n in enumerate(voicing): place(buf, rhodes(midi(n + 12), (ln + .8) * beat, .9 - i * .05), t0 + at * beat + i * .012, .16)
        # bass
        for at, n_off, ln in [(0, 0, 1.2), (2.5, 7, 1.0), (3.25, 0, .6)]:
            b = lp(sine(midi(bass + n_off), ln * beat) + .3 * sine(midi(bass + n_off) * 2, ln * beat), 380) * adsr(int(ln * beat * SR), .01, .1, .7, .15)
            place(buf, b, t0 + at * beat, .5)
        # drums
        for step in range(8):
            at = t0 + step * .5 * beat + (sw if step % 2 else 0)
            if step in (0, 5) or (step == 7 and bar % 4 == 3): place(buf, kick(), at, .85)
            if step in (2, 6): place(buf, snare(), at + .006, .6)
            place(buf, hat(step == 7), at, .22 if step % 2 else .3)
        # melody every 4th bar
        if bar % 4 in (1, 3) and bar >= 4:
            mel = [[72, 74, 76, 79], [79, 77, 76, 72], [74, 76, 79, 81]][(bar // 4) % 3]
            for i, n in enumerate(mel): place(buf, fm(midi(n), 1.2, 3, 1.4, .5, .2) * .6, t0 + (.5 + i * .75) * beat, .11)
    buf = reverb(buf, 1.6, .18)[:len(buf)]
    buf[:int(tail * SR)] += 0  # keep
    loop = buf[:int(total * SR)].copy(); wrap = buf[int(total * SR):]
    loop[:len(wrap)] += wrap
    return lofi_chain(loop)
def music_void():
    total = 32.0; buf = np.zeros(int(total * SR)); tail = 4.0
    buf = np.zeros(int((total + tail) * SR))
    chords = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [43, 50, 55, 59, 62], [40, 47, 52, 55, 59]]
    for i, ch in enumerate(chords):
        t0 = i * 8.0
        for n in ch:
            L = 9.5; seg = sum(saw(midi(n), L, d) for d in (-.006, 0, .006)) / 3
            seg = lp(seg, 900 + 500 * i % 3) * adsr(int(L * SR), 2.2, .5, .8, 3.0)
            place(buf, seg, t0, .13)
        place(buf, lp(sine(midi(ch[0] - 12), 9.5), 160) * adsr(int(9.5 * SR), 1.5, .2, .85, 3.0), t0, .5)
        for k in range(6): place(buf, bell(midi(ch[(k * 2) % len(ch)] + 24), 3.0, 1.2) * .5, t0 + 1.2 + k * 1.15, .09)
    t = t_(total + tail); buf += lp(noise(total + tail), 500) * (.5 + .5 * np.sin(2 * np.pi * t / 16)) * .05
    buf = reverb(buf, 3.2, .38, 3500)[:len(buf)]
    loop = buf[:int(total * SR)].copy(); loop[:len(buf) - int(total * SR)] += buf[int(total * SR):]
    return loop

if __name__ == '__main__':
    for name, fn in [('tap', fx_tap), ('select', fx_select), ('on', fx_on), ('off', fx_off), ('coin', fx_coin), ('cash', fx_cash), ('good', fx_good), ('bad', fx_bad),
                     ('level', fx_level), ('chest_shake', fx_chest_shake), ('print_done', fx_print_done), ('pack', fx_pack), ('send', fx_send), ('forge', fx_forge),
                     ('glitch', fx_glitch), ('perk', fx_perk), ('rival', fx_rival), ('unstable', fx_unstable), ('notify', fx_notify), ('buy', fx_buy), ('whoosh', fx_whoosh)]:
        save(name, fn(), '80k', stereo=True)
    for i in range(3): save(f'chest_open{i}', chest_open(i), '96k', stereo=True)
    save('music_lofi', music_lofi(), '112k', stereo=True, peak=.7)
    save('music_void', music_void(), '112k', stereo=True, peak=.7)
