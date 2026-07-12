/**
 * Procedural audio manager built on WebAudio — zero asset downloads,
 * runs great on low-end devices. Music and SFX have independent volume buses.
 */

type SfxName = "click" | "dash" | "coin" | "win" | "lose" | "whoosh" | "purchase" | "reward";

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private musicMode: "menu" | "game" | null = null;
  musicVolume = 0.6;
  sfxVolume = 0.8;

  /** Must be called from a user gesture (tap) to unlock audio on mobile. */
  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setVolumes(music: number, sfx: number) {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume * 0.16;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume * 0.5;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, bus: GainNode, when = 0, slideTo?: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, bus: GainNode, filterFreq = 2000) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(bus);
    src.start();
  }

  play(name: SfxName) {
    const ctx = this.ensure();
    if (!ctx || !this.sfxGain || this.sfxVolume <= 0) return;
    const bus = this.sfxGain;
    switch (name) {
      case "click":
        this.tone(700, 0.06, "square", 0.25, bus);
        break;
      case "dash":
        this.tone(300, 0.18, "sawtooth", 0.3, bus, 0, 900);
        this.noise(0.12, 0.15, bus, 4000);
        break;
      case "whoosh":
        this.noise(0.25, 0.2, bus, 1200);
        break;
      case "coin":
        this.tone(988, 0.08, "square", 0.25, bus);
        this.tone(1319, 0.15, "square", 0.25, bus, 0.07);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.35, bus, i * 0.12));
        break;
      case "lose":
        this.tone(220, 0.5, "sawtooth", 0.35, bus, 0, 55);
        this.noise(0.4, 0.3, bus, 800);
        break;
      case "purchase":
        [660, 880].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.3, bus, i * 0.09));
        break;
      case "reward":
        [523, 659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, "triangle", 0.3, bus, i * 0.08));
        break;
    }
  }

  /** Simple generative music loop — arpeggiated minor pattern with a bass pulse. */
  startMusic(mode: "menu" | "game") {
    const ctx = this.ensure();
    if (!ctx || !this.musicGain) return;
    if (this.musicMode === mode && this.musicTimer) return;
    this.stopMusic();
    this.musicMode = mode;
    const scaleMenu = [220, 261.6, 329.6, 392, 440, 523.3];
    const scaleGame = [174.6, 220, 261.6, 349.2, 415.3, 523.3];
    const scale = mode === "menu" ? scaleMenu : scaleGame;
    const stepMs = mode === "menu" ? 300 : 210;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || !this.musicGain || this.musicVolume <= 0) return;
      const s = this.musicStep++;
      const bus = this.musicGain;
      // bass every 4 steps
      if (s % 4 === 0) this.tone(scale[0] / 2, 0.4, "triangle", 0.5, bus);
      // arpeggio
      const idx = [0, 2, 4, 5, 4, 2][s % 6];
      this.tone(scale[idx], 0.28, "sine", 0.35, bus);
      if (s % 8 === 6) this.tone(scale[3] * 2, 0.2, "sine", 0.15, bus);
    }, stepMs);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicMode = null;
  }
}

export const audio = new AudioManager();

export function haptic(pattern: number | number[] = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}
