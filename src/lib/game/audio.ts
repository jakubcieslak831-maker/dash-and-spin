/**
 * Procedural audio manager built on WebAudio — zero asset downloads,
 * runs great on low-end devices. Music and SFX have independent volume buses.
 */

type SfxName =
  | "click"
  | "dash"
  | "coin"
  | "coin_combo"
  | "gem"
  | "win"
  | "levelup"
  | "lose"
  | "whoosh"
  | "nearmiss"
  | "purchase"
  | "reward"
  | "powerup"
  | "shield_break"
  | "combo";

class AudioManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;
  private musicMode: "menu" | "game" | null = null;
  musicVolume = 0.6;
  sfxVolume = 0.8;
  /** rolling coin pitch — resets when user stops picking up coins */
  private comboPitch = 0;
  private lastCoinT = 0;

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
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume * 0.55;
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
        this.noise(0.22, 0.18, bus, 1400);
        this.tone(180, 0.12, "sine", 0.15, bus, 0, 90);
        break;
      case "nearmiss":
        // rising ping — the "so close!" cue
        this.tone(1400, 0.09, "sine", 0.28, bus, 0, 2200);
        this.tone(2100, 0.11, "sine", 0.15, bus, 0.02);
        break;
      case "coin": {
        // ascending pitch when picked in rapid succession (combo)
        const now = ctx.currentTime;
        if (now - this.lastCoinT < 0.6) this.comboPitch = Math.min(this.comboPitch + 1, 12);
        else this.comboPitch = 0;
        this.lastCoinT = now;
        const base = 988 * Math.pow(1.06, this.comboPitch);
        this.tone(base, 0.07, "square", 0.22, bus);
        this.tone(base * 1.33, 0.13, "square", 0.22, bus, 0.06);
        break;
      }
      case "coin_combo":
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.28, bus, i * 0.05));
        break;
      case "gem":
        // sparkly triangle chord
        [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.35, "triangle", 0.28, bus, i * 0.04));
        this.noise(0.15, 0.08, bus, 6000);
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.25, "triangle", 0.35, bus, i * 0.11));
        this.tone(1568, 0.5, "sine", 0.25, bus, 0.44);
        break;
      case "levelup":
        // triumphant arpeggio + shimmer
        [523, 659, 784, 1047, 1318, 1568].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.3, bus, i * 0.07));
        this.tone(2093, 0.6, "sine", 0.22, bus, 0.42);
        break;
      case "lose":
        this.tone(220, 0.55, "sawtooth", 0.35, bus, 0, 55);
        this.tone(165, 0.55, "sawtooth", 0.28, bus, 0.05, 40);
        this.noise(0.4, 0.3, bus, 800);
        break;
      case "purchase":
        [660, 880, 1100].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.3, bus, i * 0.08));
        break;
      case "reward":
        [523, 659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, "triangle", 0.3, bus, i * 0.08));
        break;
      case "powerup":
        // bright rising sweep — feels like grabbing something special
        [440, 660, 880, 1320].forEach((f, i) => this.tone(f, 0.14, "triangle", 0.3, bus, i * 0.05));
        this.noise(0.1, 0.08, bus, 5000);
        break;
      case "shield_break":
        // glassy crack — your shield just saved you
        this.tone(1800, 0.08, "sine", 0.3, bus, 0, 600);
        this.tone(900, 0.12, "triangle", 0.2, bus, 0.03, 300);
        this.noise(0.15, 0.12, bus, 3000);
        break;
      case "combo":
        // escalating chime per combo milestone
        [784, 988, 1318, 1568].forEach((f, i) => this.tone(f, 0.1, "sine", 0.22, bus, i * 0.04));
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
    const stepMs = mode === "menu" ? 300 : 180;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || !this.musicGain || this.musicVolume <= 0) return;
      const s = this.musicStep++;
      const bus = this.musicGain;
      // driving bass every 2 steps in game
      if (mode === "game" ? s % 2 === 0 : s % 4 === 0) {
        this.tone(scale[0] / 2, 0.25, "sawtooth", 0.45, bus);
      }
      // arpeggio pattern
      const pattern = mode === "game" ? [0, 2, 4, 3, 4, 2, 5, 4] : [0, 2, 4, 5, 4, 2];
      const idx = pattern[s % pattern.length];
      this.tone(scale[idx], 0.24, "sine", 0.32, bus);
      // shimmer highs
      if (s % 8 === 6) this.tone(scale[3] * 2, 0.2, "sine", 0.14, bus);
      if (mode === "game" && s % 16 === 0) this.tone(scale[4] * 2, 0.3, "triangle", 0.18, bus);
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
