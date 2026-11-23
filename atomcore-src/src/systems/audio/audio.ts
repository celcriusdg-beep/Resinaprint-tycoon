import type { GameState } from '../../game/types';
import { useSettings } from '../../stores/settingsStore';

// All sound is synthesised with the Web Audio API (no audio files to download):
// plant ambience (reactor hum, turbine whine, cooling-tower rush), construction
// clanks, UI and notification effects, and a slow generative ambient score.

type SfxName =
  | 'click' | 'place' | 'complete' | 'research' | 'achievement' | 'alarm' | 'warn' | 'notify' | 'cash' | 'error' | 'clank' | 'open';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private musicBus!: GainNode;
  private humGain!: GainNode;
  private turbineGain!: GainNode;
  private turbineFilter!: BiquadFilterNode;
  private turbineOsc!: OscillatorNode;
  private whineOsc!: OscillatorNode;
  private whineGain!: GainNode;
  private coolGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private lastClank = 0;
  private lastBeep = 0;
  private unlocked = false;

  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch {
      return;
    }
    this.unlocked = true;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.sfxBus = c.createGain();
    this.ambBus = c.createGain();
    this.musicBus = c.createGain();
    for (const b of [this.sfxBus, this.ambBus, this.musicBus]) b.connect(this.master);
    this.noiseBuf = this.makeNoise();
    this.buildAmbience();
    this.applyVolumes();
    useSettings.subscribe(() => this.applyVolumes());
    this.startMusic();
    void c.resume();
  }

  private makeNoise(): AudioBuffer {
    const c = this.ctx!;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      // Pinkish noise
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
    }
    return buf;
  }

  private buildAmbience() {
    const c = this.ctx!;
    // Reactor / transformer hum: mains fundamental with harmonics.
    this.humGain = c.createGain();
    this.humGain.gain.value = 0;
    const humLp = c.createBiquadFilter();
    humLp.type = 'lowpass';
    humLp.frequency.value = 420;
    humLp.connect(this.humGain);
    this.humGain.connect(this.ambBus);
    [[50, 0.5, 'sine'], [100, 0.32, 'sine'], [150, 0.12, 'triangle'], [200, 0.06, 'sine']].forEach(([f, g, t]) => {
      const o = c.createOscillator();
      o.type = t as OscillatorType;
      o.frequency.value = f as number;
      const gg = c.createGain();
      gg.gain.value = g as number;
      o.connect(gg).connect(humLp);
      o.start();
    });
    // Turbine: filtered sawtooth rumble plus a faint high whine.
    this.turbineGain = c.createGain();
    this.turbineGain.gain.value = 0;
    this.turbineFilter = c.createBiquadFilter();
    this.turbineFilter.type = 'bandpass';
    this.turbineFilter.Q.value = 3;
    this.turbineFilter.frequency.value = 400;
    this.turbineOsc = c.createOscillator();
    this.turbineOsc.type = 'sawtooth';
    this.turbineOsc.frequency.value = 90;
    this.turbineOsc.connect(this.turbineFilter).connect(this.turbineGain).connect(this.ambBus);
    this.turbineOsc.start();
    this.whineOsc = c.createOscillator();
    this.whineOsc.type = 'sine';
    this.whineOsc.frequency.value = 1500;
    this.whineGain = c.createGain();
    this.whineGain.gain.value = 0;
    this.whineOsc.connect(this.whineGain).connect(this.ambBus);
    this.whineOsc.start();
    // Cooling: looping noise, low-passed like falling water and fan rush.
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    this.coolGain = c.createGain();
    this.coolGain.gain.value = 0;
    src.connect(lp).connect(this.coolGain).connect(this.ambBus);
    src.start();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = useSettings.getState();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambience * 0.6, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.5, t, 0.05);
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.ctx && document.visibilityState === 'visible') void this.ctx.resume();
  }

  /** Ambience follows what the active plant is doing. */
  updatePlant(g: GameState): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const site = g.sites[g.activeSite];
    const st = site.stats;
    const t = this.ctx.currentTime;
    const activity = Math.min(1, st.thermalMW > 0 ? 0.35 + Math.log10(1 + st.thermalMW) / 5 : 0);
    const turbineLoad = st.steamCapMW > 0 ? st.steamUsedMW / st.steamCapMW : 0;
    const coolLoad = st.coolingCapMW > 0 ? Math.min(1, st.heatRejectMW / st.coolingCapMW) : 0;
    this.humGain.gain.setTargetAtTime(0.05 + activity * 0.12, t, 0.5);
    this.turbineGain.gain.setTargetAtTime(turbineLoad * 0.12, t, 0.6);
    this.turbineFilter.frequency.setTargetAtTime(250 + turbineLoad * 650, t, 0.8);
    this.turbineOsc.frequency.setTargetAtTime(70 + turbineLoad * 45, t, 0.8);
    this.whineOsc.frequency.setTargetAtTime(1200 + turbineLoad * 900, t, 0.8);
    this.whineGain.gain.setTargetAtTime(turbineLoad * 0.006, t, 0.6);
    this.coolGain.gain.setTargetAtTime(0.03 + coolLoad * 0.22, t, 0.6);
    const now = performance.now();
    if (site.buildings.some((b) => b.status === 'constructing' || b.status === 'upgrading') && now - this.lastClank > 900 + Math.random() * 1400) {
      this.lastClank = now;
      this.sfx('clank');
    }
    if (st.maxTempFrac > 0.93 && now - this.lastBeep > 2200) {
      this.lastBeep = now;
      this.tone(880, 0.08, 'square', 0.05, 0);
      this.tone(880, 0.08, 'square', 0.05, 0.16);
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, bus?: GainNode, glideTo?: number) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, freq: number, vol: number, delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  sfx(name: SfxName): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'click':
        this.tone(1400, 0.04, 'triangle', 0.08);
        break;
      case 'open':
        this.tone(700, 0.06, 'sine', 0.07, 0, undefined, 1100);
        break;
      case 'place':
        this.noiseBurst(0.18, 220, 0.5);
        this.tone(110, 0.2, 'sine', 0.25);
        break;
      case 'clank':
        this.noiseBurst(0.08, 1800 + Math.random() * 1500, 0.12);
        this.tone(600 + Math.random() * 500, 0.12, 'square', 0.015);
        break;
      case 'complete':
        this.tone(660, 0.18, 'sine', 0.12);
        this.tone(990, 0.3, 'sine', 0.1, 0.12);
        break;
      case 'research':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.08, i * 0.08));
        break;
      case 'achievement':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.09, i * 0.07));
        this.tone(2093, 0.8, 'sine', 0.03, 0.35);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.tone(740, 0.22, 'square', 0.06, i * 0.5);
          this.tone(554, 0.22, 'square', 0.06, i * 0.5 + 0.25);
        }
        break;
      case 'warn':
        this.tone(520, 0.15, 'triangle', 0.08, 0, undefined, 360);
        break;
      case 'notify':
        this.tone(880, 0.12, 'sine', 0.06);
        this.tone(1320, 0.16, 'sine', 0.05, 0.08);
        break;
      case 'cash':
        this.tone(1568, 0.07, 'square', 0.04);
        this.tone(2093, 0.18, 'square', 0.04, 0.06);
        break;
      case 'error':
        this.tone(160, 0.18, 'sawtooth', 0.07);
        break;
    }
  }

  private startMusic() {
    if (this.musicTimer !== null) return;
    // A–F–C–G ambient progression, one chord every 8 s with sparse plucks.
    const chords = [
      [220, 261.63, 329.63],
      [174.61, 220, 261.63],
      [130.81, 164.81, 196],
      [196, 246.94, 293.66],
    ];
    const playChord = () => {
      const c = this.ctx;
      if (!c || c.state !== 'running' || useSettings.getState().music <= 0.001) return;
      const chord = chords[this.musicStep % chords.length];
      const t = c.currentTime;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 2.5);
      g.gain.linearRampToValueAtTime(0.04, t + 6);
      g.gain.linearRampToValueAtTime(0.0001, t + 9.5);
      lp.connect(g).connect(this.musicBus);
      for (const f of chord) {
        for (const det of [-6, 6]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f / 2;
          o.detune.value = det;
          o.connect(lp);
          o.start(t);
          o.stop(t + 10);
        }
      }
      // Sparse arpeggio
      for (let i = 0; i < 3; i++) {
        if (Math.random() < 0.55) {
          const f = chord[Math.floor(Math.random() * 3)] * (Math.random() < 0.5 ? 2 : 4);
          this.tone(f, 1.6, 'sine', 0.018, 1 + i * 2.3 + Math.random() * 0.5, this.musicBus);
        }
      }
      this.musicStep++;
    };
    playChord();
    this.musicTimer = window.setInterval(playChord, 8000);
  }
}

export const audio = new AudioEngine();
